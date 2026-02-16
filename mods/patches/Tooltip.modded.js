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

        this.root.addEventListener("mousemove", (e) => this._onMouseMove(e));
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

    bindTo(element, bindedTo, type = 'achievement') {
        element.addEventListener("mouseenter", () => {
            if (type === 'achievement') this.showAchievement(bindedTo);
            else if (type === 'item') this.showItem(bindedTo);
        });

        element.addEventListener("mouseleave", () => this.hide());
    }

    showAchievement(achievement) {
        this.tooltip.innerHTML = `
            <div class="tooltip-content">
                <span class="tooltip-description">${achievement.description[this.main.lang].toUpperCase()}</span>  
            </div>
        `;
        this.tooltip.style.display = "block";
        this._ensurePositionOnce();
    }

    showItem(item) {
        let lang = this.main.lang;
        if (item.name.length <= lang) lang = 0;

        this.tooltip.innerHTML = `
            <div class="tooltip-content">
                <span class="tooltip-name">${item.name[lang].toUpperCase()}</span>  
                <span class="tooltip-description">${item.description[lang].toUpperCase()}</span>  
            </div>
        `;
        this.tooltip.style.display = "block";
        this._ensurePositionOnce();
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
}
