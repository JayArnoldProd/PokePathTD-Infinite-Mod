import { text } from '../file/text.js';

export class Tooltip {
    constructor(main) {
        this.main = main;

        this.tooltip = document.createElement("div");
        this.tooltip.className = "tooltip";
        this.tooltip.style.position = "absolute";
        this.tooltip.style.pointerEvents = "none";
        this.tooltip.style.transformOrigin = "top left";
        this.tooltip.style.display = "none";

        this.root = document.getElementById("screen-root");
        if (!this.root) throw new Error("#screen-root no encontrado");

        const rootPos = window.getComputedStyle(this.root).position;
        if (rootPos === "static") this.root.style.position = "relative";

        this.root.appendChild(this.tooltip);

        this._lastScale = 1;

        this.root.addEventListener('mousemove', (e) => {
            if (this.tooltip.style.display === 'none') return;

            this._onMouseMove(e);
        });

        this.root.addEventListener('mouseover', (e) => {
            if (e.target.closest('.dex-scene-tutorial-text')) return;

            const element = e.target.closest('[class*="display-tooltip-"]');

            if (!element) return;

            const tooltipClass = [...element.classList].find(
                className => className.startsWith('display-tooltip-')
            );

            if (!tooltipClass) return;

            const id = tooltipClass.replace('display-tooltip-', '');

            this.showTextTooltip(id, e);
        });

        this.root.addEventListener('mouseout', (e) => {
            if (e.target.closest('.dex-scene-tutorial-text')) return;

            const element = e.target.closest('[class*="display-tooltip-"]');

            if (!element) return;

            if (element.contains(e.relatedTarget)) return;

            this.hide();
        });

        document.addEventListener('keydown', () => { this.hide(); });
        window.addEventListener('blur', () => { this.hide(); });

        this.bindings = new WeakMap();
    }

    _getScale() {
        const style = window.getComputedStyle(this.root);
        const transform = style.transform || "none";
        if (transform === "none") return 1;
        const m = transform.match(/matrix\(([^,]+),/);
        if (m) return parseFloat(m[1]) || 1;
        return 1;
    }

    _onMouseMove(e) {
        if (this.tooltip.style.display === "none") return;

        const rootRect = this.root.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;

        const scale = this._getScale();
        this._lastScale = scale;

        const mouseX = (clientX - rootRect.left) / scale;
        const mouseY = (clientY - rootRect.top) / scale;

        const tr = this.tooltip.getBoundingClientRect();
        const tooltipWidthUnscaled = (tr.width || 0) / scale;
        const tooltipHeightUnscaled = (tr.height || 0) / scale;

        let left = mouseX + 10 - tooltipWidthUnscaled / 2;
        let top = mouseY - tooltipHeightUnscaled - 13;
        if (top < 0) top = mouseY + 25;
        

        const maxLeft = this.root.offsetWidth - tooltipWidthUnscaled;
        const maxTop = this.root.offsetHeight - tooltipHeightUnscaled;

        if (left < 0) left = 0;
        if (top < 0) top = 0;
        if (left > maxLeft) left = maxLeft;
        if (top > maxTop) top = maxTop;

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    bindTo(element, bindedTo, type = 'achievement', color = 'var(--white)') {
        this.unbindTo(element);

        const mouseEnter = () => {
            if (type === 'achievement') this.showAchievement(bindedTo, color);
            else if (type === 'item') this.showItem(bindedTo, color);
        };

        const mouseLeave = () => this.hide();

        element.addEventListener("mouseenter", mouseEnter);
        element.addEventListener("mouseleave", mouseLeave);

        this.bindings.set(element, {
            mouseEnter,
            mouseLeave
        });
    }

    unbindTo(element) {
        const binding = this.bindings.get(element);

        if (!binding) return;

        element.removeEventListener("mouseenter", binding.mouseEnter);
        element.removeEventListener("mouseleave", binding.mouseLeave);

        this.bindings.delete(element);
        this.hide();
    }

    _setTooltipColor(color) {
        const tooltipColor = color || 'var(--white)';
        this.tooltip.style.borderColor = tooltipColor;
        const name = this.tooltip.querySelector('.tooltip-name');
        if (name) {
            name.style.color = tooltipColor;
            name.style.borderColor = tooltipColor;
        }
    }

    showAchievement(achievement, color = 'var(--white)') {
        this.tooltip.innerHTML = `
            <div class="tooltip-content" style="max-width: 280px; width: auto;">
                <span class="tooltip-description">
                    ${this.main.utility.parseText(
                        achievement.description[this.main.lang].toUpperCase()
                    )}
                </span>
            </div>
        `;

        this._setTooltipColor(color);

        this.tooltip.style.paddingBottom = "10px";
        this.tooltip.style.display = "block";
        this._ensurePositionOnce();
    }

    showItem(item, color = 'var(--white)') {

        let lang = this.main.lang;
        if (item.name.length <= lang) lang = 0;

        this.tooltip.style.paddingBottom = "10px";

        this.tooltip.innerHTML = `
            <div class="tooltip-content" style="max-width: 280px; width: auto;">
                <span class="tooltip-name">${item.name[lang].toUpperCase()}</span>
                <span class="tooltip-description">
                    ${this.main.utility.parseText(item.description[lang])}
                </span>
            </div>
        `;

        this._setTooltipColor(color);

        this.tooltip.style.display = "block";
        this._ensurePositionOnce();
    }


    showTextTooltip(id, event) {
        const tooltipData = text.tooltip?.[id];

        if (!tooltipData) return;

        this.tooltip.innerHTML = `
            <div class="tooltip-content" style="max-width: 280px; width: auto;">
                <span class="tooltip-name">${this.main.utility.parseText(tooltipData.title[this.main.lang] || '')}</span>
                <span class="tooltip-description">
                    ${this.main.utility.parseText(tooltipData.text[this.main.lang] || '')}
                </span>
            </div>
        `;

        this._setTooltipColor();

        this.tooltip.style.paddingBottom = "10px";
        this.tooltip.style.display = "block";

        this._onMouseMove(event);
    }
   
    _ensurePositionOnce() {
        const ev = window.event;
        if (ev && ev.type && (ev.clientX !== undefined)) {
            this._onMouseMove(ev);
        } else {
            const rootW = this.root.offsetWidth;
            const rootH = this.root.offsetHeight;
            const fakeEvent = { clientX: this.root.getBoundingClientRect().left + rootW / 2, clientY: this.root.getBoundingClientRect().top + rootH / 2 };
            this._onMouseMove(fakeEvent);
        }
    }

    hide() {
        this.tooltip.style.display = "none";
    }

	showText(text) {
        this.tooltip.innerHTML = `
            <div class="tooltip-content" style="width: fit-content !important; min-width: unset !important; max-width: fit-content !important; padding: 4px 10px !important;">
                <span class="tooltip-name" style="white-space: nowrap; display: inline-block;">${text.toUpperCase()}</span>
            </div>
        `;
        this.tooltip.style.cssText = "position: absolute; pointer-events: none; display: block; width: fit-content !important; min-width: unset !important; max-width: fit-content !important;";
        this._ensurePositionOnce();
    }

	bindTextTo(element, text) {
        element.addEventListener("mouseenter", () => this.showText(text));
        element.addEventListener("mouseleave", () => this.hide());
    }
}
