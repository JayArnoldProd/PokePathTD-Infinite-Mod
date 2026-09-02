#!/usr/bin/env node

const port = Number(process.argv[2] || 9224);
const expectedRows = Number(process.argv[3] || 148);
const deadline = Date.now() + 30_000;

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function getPageTarget() {
    while (Date.now() < deadline) {
        try {
            const response = await fetch(`http://127.0.0.1:${port}/json`);
            const targets = await response.json();
            const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
            if (page) return page;
        } catch (_) {
            // Electron may still be starting.
        }
        await delay(250);
    }
    throw new Error(`No Electron page target appeared on port ${port}`);
}

async function main() {
const target = await getPageTarget();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
});

let nextId = 0;
const pending = new Map();
const failures = [];

socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
        const operation = pending.get(message.id);
        if (!operation) return;
        pending.delete(message.id);
        if (message.error) operation.reject(new Error(message.error.message));
        else operation.resolve(message.result);
        return;
    }

    if (message.method === 'Runtime.exceptionThrown') {
        failures.push(`Runtime.exceptionThrown: ${message.params?.exceptionDetails?.text || 'unknown error'}`);
    } else if (message.method === 'Debugger.scriptFailedToParse') {
        failures.push(`Debugger.scriptFailedToParse: ${message.params?.url || 'unknown script'}`);
    } else if (message.method === 'Network.loadingFailed' && !message.params?.canceled) {
        failures.push(`Network.loadingFailed: ${message.params?.errorText || 'unknown request error'}`);
    } else if (message.method === 'Log.entryAdded' && message.params?.entry?.level === 'error') {
        failures.push(`Log.entryAdded: ${message.params.entry.text || 'unknown log error'}`);
    }
});

function send(method, params = {}) {
    const id = ++nextId;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

for (const domain of ['Runtime', 'Debugger', 'Log', 'Network', 'Page']) {
    await send(`${domain}.enable`);
}

await send('Page.reload', { ignoreCache: true });
await delay(8_000);

const evaluation = await send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
        const waitFor = async (selector, timeout = 12000) => {
            const end = Date.now() + timeout;
            while (Date.now() < end) {
                const element = document.querySelector(selector);
                if (element) return element;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            throw new Error('Timed out waiting for ' + selector);
        };

        const firstSection = await waitFor('.ui-section');
        firstSection.click();
        const buttons = document.querySelectorAll('.profile-subview-button');
        if (buttons.length < 2) throw new Error('Unlockables tab button was not rendered');
        buttons[1].click();
        await new Promise(resolve => setTimeout(resolve, 500));

        const rows = [...document.querySelectorAll('.profile-unlockable-row')];
        const conditions = rows.map(row => row.querySelector('.profile-unlockable-condition')?.innerText || '');
        const names = rows.map(row => row.querySelector('.profile-unlockable-name')?.innerText || '');
        return {
            readyState: document.readyState,
            title: document.title,
            rowCount: rows.length,
            headerCount: document.querySelector('.profile-unlockables-header-count')?.innerText || '',
            visible: getComputedStyle(document.querySelector('.profile-unlockables-container')).display !== 'none',
            emptyConditions: conditions.filter(value => !value.trim()).length,
            undefinedConditions: conditions.filter(value => /undefined|null/i.test(value)).length,
            lastName: names.at(-1),
            lastCondition: conditions.at(-1),
        };
    })()`,
});

if (evaluation.exceptionDetails) {
    failures.push(`Profile interaction failed: ${evaluation.exceptionDetails.text}`);
}

const result = evaluation.result?.value;
if (!result) failures.push('Profile interaction returned no result');
else {
    if (result.readyState !== 'complete') failures.push(`document.readyState is ${result.readyState}`);
    if (!result.visible) failures.push('Unlockables panel is not visible after clicking its tab');
    if (result.rowCount !== expectedRows) failures.push(`Unlockables row count is ${result.rowCount}, expected ${expectedRows}`);
    if (!result.headerCount.endsWith(`/${expectedRows}`)) failures.push(`Unlockables header count is ${result.headerCount}, expected */${expectedRows}`);
    if (result.emptyConditions) failures.push(`${result.emptyConditions} Unlockables rows have empty conditions`);
    if (result.undefinedConditions) failures.push(`${result.undefinedConditions} Unlockables rows contain undefined/null text`);
}

socket.close();

if (failures.length) {
    console.error('Electron Profile smoke test failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    if (result) console.error(JSON.stringify(result, null, 2));
    process.exit(1);
}

console.log('Electron Profile smoke test passed:');
console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
    console.error(`Electron Profile smoke test failed: ${error.stack || error.message}`);
    process.exit(1);
});
