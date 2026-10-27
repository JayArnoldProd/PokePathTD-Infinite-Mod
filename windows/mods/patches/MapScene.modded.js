import { SectionScene } from '../../utils/SectionScene.js';
import { Element } from '../../utils/Element.js';
import { text } from '../../file/text.js';
import { routeData } from '../data/routeData.js';
import { saveData } from '../../file/data.js';
import { playSound } from '../../file/audio.js';

const CHALLENGES_LIST = ['lvlCap', 'slotLimit', 'toughEnemies', 'draft', 'noItems', 'permadeath', 'mirror'];

export class MapScene extends SectionScene {
	constructor(main) {
	    super();
	    this.main = main;

	    this.globalView = true;
	    this.sortedRoutes = Object.values(routeData || {}).sort((a, b) => a.order - b.order);
	    this.render();
	}

	render() {
	    this.routeContainer = new Element(this.container, {
	        className: 'maps-scene-route-container maps-scene-route-container-global stroke'
	    }).element;

	    this.secretContainer = new Element(this.container, {
	        className: 'maps-scene-secret-container'
	    }).element;

	    this.routes = [];
	    this.secretRoutes = [];
	    this.viewMode = 'global';

	    this.renderGlobalView();
	    this.navBar = new Element(this.container, {
	        className: 'maps-scene-nav-bar'
	    }).element;

	    this.viewButton = new Element(this.navBar, {
	        className: 'maps-scene-nav-button stroke',
	        text: text.map.routeView[this.main.lang].toUpperCase()
	    }).element;

		this.viewButton.addEventListener('mouseenter', () => playSound('hover3', 'ui'));
		this.viewButton.addEventListener('click', () => this.toggleView());

		this.editorButton = new Element(this.navBar, {
		    className: 'maps-scene-nav-button stroke'
		}).element;

		this.editorButton.addEventListener('mouseenter', () => playSound('hover3', 'ui'));
		this.editorButton.addEventListener('click', () => {
		    this.main.editorScene.open();
		});
	}

	isSecretMapUnlocked(route) {
	    const secretMapKeysById = {
	        20: 'manaphyCave',
	        31: 'victiniCave',
	        32: 'marshadowCave',
	        33: 'secretCastle',
	        35: 'secretChess',
	        46: 'halloween2026'
	    };

	    const key = secretMapKeysById[route.id];
	    if (!key) return false;

	    const player = this.main.player;
	    return !!(player && player.secretMaps && player.secretMaps[key]);
	}

	createRouteElement(route, container, variant = 'large') {
	    const isGlobal = variant === 'global';
	    const isSecretTile = variant === 'secret';

	    const isMultiCell = Array.isArray(route.pos) && route.pos.length >= 2;
	    const isXL = isGlobal && isMultiCell && !!route.xl;
	    const isXLV = isGlobal && isMultiCell && !!route.xlv;
	    const isXLH = isGlobal && isMultiCell && !!route.xlh;

	    const routeElement = new Element(container, {
	        className: isXL
			    ? 'maps-scene-route maps-scene-route-xl'
			    : isXLV
			    ? 'maps-scene-route maps-scene-route-xlv'
			    : isXLH
			    ? 'maps-scene-route maps-scene-route-xlh'
			    : isSecretTile
			    ? 'maps-scene-route maps-scene-route-secret'
			    : isGlobal
			    ? 'maps-scene-route'
			    : 'maps-scene-route maps-scene-route-large',
	        image: route.background
	    }).element;

	    if (isGlobal) {
	        const anchorPos = isMultiCell ? route.pos[0] : route.pos;
	        const col = (anchorPos % 9) + 1;
	        const row = Math.floor(anchorPos / 9) + 1;

	        routeElement.style.gridColumn = isXL
			    ? `${col} / span 2`
			    : isXLH
			    ? `${col} / span 3`
			    : `${col}`;

	        routeElement.style.gridRow = isXLV
	            ? `${row} / span 3`
	            : `${row}`;
	    }

	    routeElement.dataset.routeId = route.id;

	    const emptyElement = isGlobal ? new Element(container, {
	        className: 'maps-scene-route-empty',
	        text: '?'
	    }).element : null;

	    if (emptyElement) {
	        emptyElement.style.gridColumn = routeElement.style.gridColumn;
	        emptyElement.style.gridRow = routeElement.style.gridRow;
	    }

	    const nameEl = new Element(routeElement, {
	        className: 'maps-scene-route-name stroke',
	        text: route.name[this.main.lang].toUpperCase()
	    }).element;

	    const recordContainer = new Element(routeElement, {
	        className: 'maps-scene-route-record-container stroke'
	    }).element;

	    const recordEl = new Element(recordContainer, {
	        className: 'maps-scene-route-record stroke'
	    }).element;

	    const requiresEl = new Element(routeElement, {
	        className: 'maps-scene-route-requires stroke'
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

	renderGlobalView() {
		this.globalView = true;
	    this.routeContainer.innerHTML = '';

	    this.routeContainer.classList.remove('maps-scene-route-container-routes');
	    this.routeContainer.classList.add('maps-scene-route-container-global');

	    this.routes = [];

	    const mainRoutes = this.sortedRoutes.filter(route => !route.isSecret || route.id === 30);

	    const routesByPos = {};
	    const occupiedCells = new Set();

	    mainRoutes.forEach(r => {
	        if (Array.isArray(r.pos)) {
	            routesByPos[r.pos[0]] = r;

	            for (let p = 1; p < r.pos.length; p++) {
	                occupiedCells.add(r.pos[p]);
	            }
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

	        this.createRouteElement(route, this.routeContainer, 'global');
	    }

	    this.renderSecretGlobalContainer();
	}

	renderSecretGlobalContainer() {
	    this.secretContainer.innerHTML = '';

	    const secretRoutes = this.sortedRoutes.filter(route =>
	        route.isSecret && route.id !== 30 && this.isSecretMapUnlocked(route)
	    );

	    if (!secretRoutes.length) {
	        this.secretContainer.style.display = 'none';
	        return;
	    }

	    this.secretContainer.style.display = 'flex';

	    secretRoutes.forEach(route => {
	        this.createRouteElement(route, this.secretContainer, 'secret');
	    });
	}

	renderRoutesView() {
		this.globalView = false;
	    this.routeContainer.innerHTML = '';
	    this.secretContainer.style.display = 'none';

	    this.routeContainer.classList.remove('maps-scene-route-container-global');
	    this.routeContainer.classList.add('maps-scene-route-container-routes');

	    this.routes = [];

	    const visibleRoutes = this.sortedRoutes.filter(route => !route.isSecret);
	    const secretRoutes = this.sortedRoutes.filter(route =>
	        route.isSecret && (route.id === 30 || this.isSecretMapUnlocked(route))
	    );

	    for (let i = 0; i < visibleRoutes.length; i += 4) {
	        const group = visibleRoutes.slice(i, i + 4);

	        const groupContainer = new Element(this.routeContainer, {
	            className: 'maps-scene-route-group'
	        }).element;

	        const groupTitle = new Element(groupContainer, {
			    className: 'maps-scene-route-group-title'
			}).element;

			new Element(groupTitle, {
			    className: 'maps-scene-route-group-title-text',
			    text: group[0].name[this.main.lang]
			        .replace(/-\d+$/, '')
			        .toUpperCase()
			});

			// const progress = new Element(groupTitle, {
			//     className: 'maps-scene-route-progress'
			// }).element;

			// new Element(progress, {
			//     className: 'maps-scene-route-progress-image',
			//     image: './src/assets/images/icons/ribbon3.png'
			// });

			// new Element(progress, {
			//     className: 'maps-scene-route-progress-text',
			//     text: '0/40'
			// });

	        const mapsContainer = new Element(groupContainer, {
	            className: 'maps-scene-route-group-maps'
	        }).element;

	        group.forEach(route => {
	            this.createRouteElement(route, mapsContainer, 'large');
	        });
	    }

	    if (secretRoutes.length) {
	        const secretGroupContainer = new Element(this.routeContainer, {
	            className: 'maps-scene-route-group maps-scene-route-group-secret'
	        }).element;

	        new Element(secretGroupContainer, {
	            className: 'maps-scene-route-group-title maps-scene-route-group-title-secret',
	            text: text.map.secretRoutes[this.main.lang].toUpperCase()
	        });

	        const secretMapsContainer = new Element(secretGroupContainer, {
	            className: 'maps-scene-route-group-maps'
	        }).element;

	        secretRoutes.forEach(route => {
	            this.createRouteElement(route, secretMapsContainer, 'large');
	        });
	    }

	    this.routeContainer.scrollTop = 0;
	}

	toggleView() {
	    playSound('option', 'ui');

	    this.viewMode = this.viewMode === 'global'
	        ? 'routes'
	        : 'global';

	    if (this.viewMode === 'global') {
	        this.viewButton.innerHTML = text.map.routeView[this.main.lang].toUpperCase();
	        this.renderGlobalView();
	    } else {
	        this.viewButton.innerHTML = text.map.globalView[this.main.lang].toUpperCase();
	        this.renderRoutesView();
	    }

	    this.update();
	}

	update() {
		this.viewButton.style.display = 'block';
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
		} else {
		    this.editorButton.style.display = 'none';
		}

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
            } else if (
                recordValue >= 100 ||
                (route.id === 20 && this.main.player.secrets['phione']) ||
                (route.id === 30 && this.main.player.secrets['mew']) ||
            	(route.id === 31 && this.main.player.secrets['victini']) ||
            	(route.id === 32 && this.main.player.secrets['marshadow']) ||
            	(route.id === 33 && this.main.player.secrets['farfetchdGalar']) ||
            	(route.id === 35 && this.main.player.secrets['calyrex']) ||
            	(route.id === 46 && this.main.player.secrets['spectrier'])
            ) {
                element.style.borderColor = '#2d70e3';
                record.parentElement.style.backgroundColor = 'var(--blue)';
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
                requires.innerHTML = `<span class="msrrem">${this.main.utility.drawStarEmoji(this.main.uiTheme)}</span>${route.unlock}`;
            }
            if (this.globalView) {
                if (route.id === 30 || route.isSecret) {
				    record.innerHTML = `<span class="msrrem">${this.main.utility.drawStarEmoji(this.main.uiTheme)}</span>???`;
				} else {
				    record.innerHTML = `<span class="msrrem">${this.main.utility.drawStarEmoji(this.main.uiTheme)}</span>${recordValue}`;
				}
            } else {
                if (route.id === 30 || route.isSecret) {
				    record.innerHTML = `<span class="msrrem">${this.main.utility.drawStarEmoji(this.main.uiTheme)}</span>???`;
				} else {
				    record.innerHTML = `
				        <span class="msrrem">${this.main.utility.drawStarEmoji(this.main.uiTheme)}</span>${recordValue}
				        <span class="route-progress">
				            <img src="./src/assets/images/icons/ribbon1.png">
				            <span>${this.getRibbons(route.id)}/10</span>
				        </span>
				    `;
				}
            }
        });
    }

    getRibbons(route) {
        let ribbons = 0;

		CHALLENGES_LIST.forEach((label, i) => {
			const challengeData =
				this.main.player.challenges[label] &&
				this.main.player.challenges[label][route]
					? this.main.player.challenges[label][route]
					: [];

			const maxJ = (i <= 2) ? 2 : 1;

			for (let j = 0; j < maxJ; j++) {
				if (challengeData[j]) {
					ribbons++;
				}
			}
		});
		return ribbons;
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

	    this.showMirageIsland =
		    this.main.player.mirageIslandDiscovered ||
		    Math.random() < 0.01;

	    if (this.viewMode === 'global') {
	        this.renderGlobalView();
	    } else {
	        this.renderRoutesView();
	    }

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
