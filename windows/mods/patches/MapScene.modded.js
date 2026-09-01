import { SectionScene } from '../../utils/SectionScene.js';
import { Element } from '../../utils/Element.js';
import { text } from '../../file/text.js';
import { routeData } from '../data/routeData.js';
import { saveData } from '../../file/data.js';
import { playSound } from '../../file/audio.js';

export class MapScene extends SectionScene {
	constructor(main) {
	    super();
	    this.main = main;

	    this.sortedRoutes = Object.values(routeData || {}).sort((a, b) => a.order - b.order);
	    this.render();
	}

	render() {
	    this.routeContainer = new Element(this.container, { className: 'maps-scene-route-container' }).element;
	    this.routes = [];
	    this.secretRoutes = [];

	    const routesByPos = {};
	    const occupiedCells = new Set();

	    this.sortedRoutes.forEach(r => {
	        if (Array.isArray(r.pos)) {
	            routesByPos[r.pos[0]] = r;
	            for (let p = 1; p < r.pos.length; p++) occupiedCells.add(r.pos[p]);
	        } else {
	            routesByPos[r.pos] = r;
	        }
	    });

	    for (let i = 0; i < 54; i++) {
	        if (occupiedCells.has(i)) continue;

	        const route = routesByPos[i];

	        if (!route) {
			    new Element(this.routeContainer, {
			        className: 'maps-scene-route-empty',
			        text: '?'
			    });
			    continue;
			}

	        const isMultiCell = Array.isArray(route.pos) && route.pos.length >= 2;
	        const isXL  = isMultiCell && !!route.xl;
	        const isXLV = isMultiCell && !!route.xlv;
	        const anchorPos = isMultiCell ? route.pos[0] : route.pos;
	        const col = (anchorPos % 9) + 1;
	        const row = Math.floor(anchorPos / 9) + 1;

	        const routeElement = new Element(this.routeContainer, {
	            className: isXL
	                ? 'maps-scene-route maps-scene-route-xl'
	                : isXLV
	                ? 'maps-scene-route maps-scene-route-xlv'
	                : 'maps-scene-route',
	            image: route.background
	        }).element;

	        routeElement.style.gridColumn = isXL ? `${col} / span 2` : `${col}`;
	        routeElement.style.gridRow = isXLV ? `${row} / span 3` : `${row}`;

	        routeElement.dataset.routeId = route.id;

	        const emptyElement = new Element(this.routeContainer, {
			    className: 'maps-scene-route-empty',
			    text: '?'
			}).element;

			emptyElement.style.gridColumn = routeElement.style.gridColumn;
			emptyElement.style.gridRow = routeElement.style.gridRow;

	        const nameEl = new Element(routeElement, {
	            className: 'maps-scene-route-name',
	            text: route.name[this.main.lang].toUpperCase()
	        }).element;

	        const recordContainer = new Element(routeElement, {
	            className: 'maps-scene-route-record-container'
	        }).element;

	        const recordEl = new Element(recordContainer, {
	            className: 'maps-scene-route-record'
	        }).element;

	        const requiresEl = new Element(routeElement, {
	            className: 'maps-scene-route-requires'
	        }).element;

	        this.routes.push({
			    element: routeElement,
			    empty: emptyElement,
			    name: nameEl,
			    recordContainer,
			    record: recordEl,
			    requires: requiresEl,
			    data: route
			});

	        routeElement.addEventListener('click', () => this.changeMap(route.id));
	        routeElement.addEventListener('mouseenter', () => playSound('hover2', 'ui'));
	    }

	    this.editorButton = new Element(this.container, { className: 'maps-scene-editor-button' }).element;
	    this.editorButton.addEventListener('mouseenter', () => playSound('hover3', 'ui'));
	    this.editorButton.addEventListener('click', () => { this.main.editorScene.open(); })
	}

	update() {
		if (this.main.player.hasEditable) {
			this.editorButton.style.display = 'block';
			this.editorButton.innerHTML = text.editable.title[this.main.lang].toUpperCase();
			if (!this.main.area.waveActive) {
				this.editorButton.style.filter = 'revert-layer';
                this.editorButton.style.pointerEvents = 'all';
			} else {
				this.editorButton.style.filter = 'brightness(0.8)';
                this.editorButton.style.pointerEvents = 'none';
			}
		} else this.editorButton.style.display = 'none'

        this.routes.forEach(({ element, empty, record, requires, name, data: route }) => {
	const visible =
			    route.id !== 30 ||
			    this.main.player.mirageIslandDiscovered ||
			    this.showMirageIsland;

			element.style.display = visible ? '' : 'none';

			if (empty) {
			    empty.style.display = visible ? 'none' : '';
			}

			if (!visible) return;

            const current = this.main.area.routeNumber;
            const stars = this.main.player.stars;
            const recordValue = this.main.player.records[route.id] || 0;

            name.innerText = route.name[this.main.lang].toUpperCase();

            if (current === route.id) {
                element.style.borderColor = 'var(--red)';
                record.parentElement.style.backgroundColor = 'var(--red)';
                element.style.pointerEvents = 'none';
            } else if (recordValue >= 100 || (route.id === 30 && this.main.player.secrets['mew'])) {
                element.style.borderColor = '#2d70e3';
                record.parentElement.style.backgroundColor = '#2d70e3';
            } else {
                element.style.borderColor = 'revert-layer';
                record.parentElement.style.backgroundColor = 'revert-layer';
            }

            if (stars >= route.unlock) {
                requires.innerHTML = '';
                if (!this.main.area.waveActive) {
                    element.style.filter = 'revert-layer';
                    element.style.pointerEvents = 'all';
                } else {
                    element.style.filter = 'brightness(0.8)';
                    element.style.pointerEvents = 'none';
                }
            } else {
                element.style.filter = 'brightness(0.5)';
                element.style.pointerEvents = 'none';
                requires.innerHTML = `<span class="msrre">⭐</span>${route.unlock}`;
            }

			if (route.id === 30) {
			    record.innerHTML = `<span class="msrre">⭐</span>???`;
			} else {
			    record.innerHTML = `<span class="msrre">⭐</span>${recordValue}`;
			}
        });
    }

	chanegTab(i) {
		playSound('option', 'ui');
		this.tabSelected = i;
		this.update();
	}

	changeMap(pos) {
		if (pos === 30 && !this.main.player.mirageIslandDiscovered) {
	        this.main.player.mirageIslandDiscovered = true;
	    }
		if (pos === this.main.area.routeNumber) return this.close();

		this.main.area.loadArea(pos);
		this.main.UI.update();
		if (!this.main.area.isCustom) saveData(this.main.player, this.main.team, this.main.box, this.main.area, this.main.shop, this.main.teamManager);
		const previewEnemy = this.main.area.getWavePreview(this.main.area.waveNumber);
		if (previewEnemy) this.main.UI.displayEnemyInfo(previewEnemy, 0);
		this.main.area.checkWeather();
		this.close();
		playSound('step', 'ui');
	}

	open() {
	    if (this.main.area.inChallenge) return;
	    if (this.main.game.stopped) return playSound('pop0', 'ui');
	    if (this.isOpen) return this.close();

	    // ¿Debe aparecer la Isla Espejismo esta vez?
	    this.showMirageIsland =
		    this.main.player.mirageIslandDiscovered ||
		    Math.random() < 0.01;

	    this.main.sections.forEach(section => {
	        if (section.isOpen && section != this) section.close();
	    });

	    super.open();
	    this.update();
	    this.main.game.cancelDeployUnit();
	    this.main.UI.section['map'].classList.add('is-selected');
	    if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();
	}

	close() {
		super.close();
		this.main.UI.section['map'].classList.remove('is-selected');
	}
}
