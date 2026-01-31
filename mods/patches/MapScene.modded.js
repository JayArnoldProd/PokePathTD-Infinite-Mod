import { GameScene } from '../../utils/GameScene.js';
import { Element } from '../../utils/Element.js';
import { text } from '../../file/text.js';
import { routeData } from '../data/routeData.js';
import { saveData } from '../../file/data.js';
import { playSound } from '../../file/audio.js';

export class MapScene extends GameScene {
	constructor(main) {
	    super(560, 404);
	    this.main = main;

	    // console.log("routeData:", routeData);
	    // console.log("typeof routeData:", typeof routeData);
	    // console.log("keys de routeData:", routeData ? Object.keys(routeData) : "routeData es null/undefined");

	    this.sortedRoutes = Object.values(routeData || {})
	        .sort((a, b) => a.order - b.order);

	    // console.log("sortedRoutes después de crear:", this.sortedRoutes);
	    // console.log("longitud:", this.sortedRoutes?.length);

	    this.render();
	}

	render() {
		this.title.innerHTML = text.map.title[this.main.lang].toUpperCase();

		this.routeContainer = new Element(this.container, { className: 'maps-scene-route-container' }).element;
		this.routes = [];

		this.sortedRoutes.forEach((route, index) => {
            const routeElement = new Element(this.routeContainer, {
                className: 'maps-scene-route',
                image: route.background
            }).element;

            routeElement.dataset.routeId = route.id;      
            routeElement.dataset.routeIndex = index;

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
                name: nameEl,
                recordContainer,
                record: recordEl,
                requires: requiresEl,
                data: route
            });

            routeElement.addEventListener('click', () => {
                this.changeMap(route.id); 
            });

            routeElement.addEventListener('mouseenter', () => {
                playSound('hover2', 'ui');
            });
        });

		this.background.addEventListener('click', (e) => { if (e.target == this.background) this.close() })
	}

	update() {
        this.title.innerHTML = text.map.title[this.main.lang].toUpperCase();

        this.routes.forEach(({ element, record, requires, name, data: route }) => {
            const current = this.main.area.routeNumber;
            const stars = this.main.player.stars;
            const recordValue = this.main.player.records[route.id] || 0;
            
            name.innerText = route.name[this.main.lang].toUpperCase();

            // Highlight de la ruta actual
            if (current === route.id) {
                element.style.borderColor = 'var(--red)';
                record.parentElement.style.backgroundColor = 'var(--red)';
                element.style.pointerEvents = 'none';
            } else if (recordValue >= 100) {
                element.style.borderColor = '#2d70e3';
                record.parentElement.style.backgroundColor = '#2d70e3';
            } else {
                element.style.borderColor = 'revert-layer';
                record.parentElement.style.backgroundColor = 'revert-layer';
            }

            // Unlock / bloqueo
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

            // Actualizar nombre y récord
            record.innerHTML = `<span class="msrre">⭐</span>${recordValue}`;
        });
    }

	chanegTab(i) {
		playSound('option', 'ui');
		this.tabSelected = i;
		this.update();
	}

	changeMap(pos) {
		if (pos === this.main.area.routeNumber) return;
		this.main.area.loadArea(pos);
		this.main.UI.update();
		saveData(this.main.player, this.main.team, this.main.box, this.main.area, this.main.shop, this.main.teamManager);
		this.main.UI.displayEnemyInfo(this.main.area.waves[this.main.area.waveNumber].preview[0], 0);
		this.main.area.checkWeather();
		this.close();
		playSound('step', 'ui');
	}

	displayRoutes() {
		for (let i = 0; i < 12; i++) {
				if (this.main.area.routeNumber === i) { 
					this.routes[i].style.borderColor = 'var(--red)';
					this.routes[i].recordContainer.style.backgroundColor = 'var(--red)';
				} else {
					if (this.main.player.records[i] >= 100) {
						this.routes[i].style.borderColor = '#2d70e3';
						this.routes[i].recordContainer.style.backgroundColor = '#2d70e3';
					} else {
						this.routes[i].style.borderColor = 'revert-layer';
						this.routes[i].recordContainer.style.backgroundColor = 'revert-layer';
					}
				}

				if (this.main.player.stars >= routeData[i].unlock) {
					this.routes[i].requires.innerHTML = ``;
					if (!this.main.area.waveActive) {
						this.routes[i].style.filter = `revert-layer`;
						this.routes[i].style.pointerEvents = `all`;
					} else {
						this.routes[i].style.filter = `brightness(0.8)`;
						this.routes[i].style.pointerEvents = `none`;
					}	
				} else {
					this.routes[i].style.filter = `brightness(0.5)`;
					this.routes[i].style.pointerEvents = `none`;
					this.routes[i].requires.innerHTML = `<span class="msrre">⭐</span>${routeData[i].unlock}`;
				}

				if (this.main.area.routeNumber === i) this.routes[i].style.pointerEvents = `none`;
				this.routes[i].name.innerText = routeData[i].name[this.main.lang].toUpperCase();
				this.routes[i].record.innerHTML = `<span class="msrre">⭐</span>${this.main.player.records[i]}`;
			}	
	}

	open() {
		if (this.main.area.inChallenge) return;
		super.open();
		this.update();
		if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();
	}
}