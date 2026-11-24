/**
 * Galway Animaciones Inmersivas v2.1.0
 * Escenario Maestro de cortinas apiladas + Lenis + GSAP ScrollTrigger + Entorno Submarino + Menú Overlay
 */
(function () {
	'use strict';

	function isElementorEditor() {
		return (
			document.body.classList.contains('elementor-editor-active') ||
			window.location.search.indexOf('elementor-preview=') !== -1
		);
	}

	function prefersReducedMotion() {
		return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	document.addEventListener('DOMContentLoaded', function () {
		if (isElementorEditor()) {
			return;
		}

		var reducedMotion = prefersReducedMotion();
		var lenis = null;

		// 1. Inicializar Lenis + sincronizar con GSAP ScrollTrigger
		if (typeof Lenis !== 'undefined' && typeof gsap !== 'undefined' && !reducedMotion) {
			gsap.registerPlugin(ScrollTrigger);

			lenis = new Lenis({
				duration: 1.25,
				easing: function (t) {
					return Math.min(1, 1.001 - Math.pow(2, -10 * t));
				},
				smoothWheel: true,
				wheelMultiplier: 0.95
			});

			lenis.on('scroll', ScrollTrigger.update);

			gsap.ticker.add(function (time) {
				lenis.raf(time * 1000);
			});
			gsap.ticker.lagSmoothing(0);
		} else if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
			gsap.registerPlugin(ScrollTrigger);
		}

		// 2. Menú Sánduche Overlay + Panel de 4 tarjetas (JOURNEYS)
		initMenuOverlay(lenis);

		// 3. Envío AJAX del formulario [galway_trip_quiz]
		initTripQuiz();

		if (reducedMotion || typeof gsap === 'undefined') {
			return;
		}

		// 4. Escenario Maestro de cortinas montadas en escritorio (o flujo adaptable en móvil)
		var stageInfo = initMasterStage(lenis);

		// 5. Entorno submarino (burbujas/partículas) + nado continuo e interactivo del lobo marino
		initOceanScene(stageInfo);

		// 6. Indicador lateral de escenas y enlaces #plan-your-trip
		initDepthNavigation(lenis, stageInfo);
	});

	/**
	 * Controla la apertura/cierre del menú overlay y la aparición del panel Journeys.
	 */
	function initMenuOverlay(lenis) {
		var overlay = document.querySelector('.gw-menu-overlay, .g-e1203d2');
		var toggles = document.querySelectorAll('.gw-menu-toggle, .g-22674b6');
		var closeBtns = document.querySelectorAll('.gw-menu-close, .g-9e390e4');
		var journeysTrigger = document.querySelector('.gw-journeys-trigger, .g-be34468');

		if (!overlay || !toggles.length) {
			return;
		}

		function openMenu(e) {
			if (e) e.preventDefault();
			overlay.classList.add('is-open');
			if (lenis) lenis.stop();
		}

		function closeMenu(e) {
			if (e) e.preventDefault();
			overlay.classList.remove('is-open');
			overlay.classList.remove('journeys-active');
			if (lenis) lenis.start();
		}

		toggles.forEach(function (btn) {
			btn.addEventListener('click', function (e) {
				if (overlay.classList.contains('is-open')) {
					closeMenu(e);
				} else {
					openMenu(e);
				}
			});
		});

		closeBtns.forEach(function (btn) {
			btn.addEventListener('click', closeMenu);
		});

		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
				closeMenu();
			}
		});

		if (journeysTrigger) {
			journeysTrigger.addEventListener('mouseenter', function () {
				overlay.classList.add('journeys-active');
			});
			journeysTrigger.addEventListener('click', function (e) {
				if (!overlay.classList.contains('journeys-active')) {
					e.preventDefault();
					overlay.classList.add('journeys-active');
				}
			});
		}
	}

	/**
	 * Orquesta el escenario maestro en escritorio: cada sección se monta encima de la actual.
	 */
	function initMasterStage(lenis) {
		var allScenes = gsap.utils.toArray('.gw-scene, .g-ede2985').filter(function (el) {
			return !el.classList.contains('gw-menu-overlay') && !el.classList.contains('g-e1203d2');
		});

		if (allScenes.length < 2) {
			return { scenes: allScenes, masterTrigger: null, setDotCallback: null };
		}

		var pillarsWrap = document.querySelector('.gw-pillars, .g-4b09dba');
		var pillars = pillarsWrap ? pillarsWrap.querySelectorAll('.gw-pillar, .g-4913cbe') : [];
		var currentPillar = -1;

		// Pausar videos de pilares al inicio (solo los controla el scroll)
		pillars.forEach(function (pillar) {
			var vid = pillar.querySelector('video');
			if (!vid) return;
			vid.muted = true;
			vid.loop = true;
			vid.playsInline = true;
			vid.pause();
		});

		function setActivePillar(index) {
			if (!pillarsWrap || index === currentPillar) return;
			currentPillar = index;

			if (index < 0) {
				pillarsWrap.classList.remove('has-active-pillar');
			} else {
				pillarsWrap.classList.add('has-active-pillar');
			}

			pillars.forEach(function (pillar, i) {
				var vid = pillar.querySelector('video');
				if (i === index) {
					pillar.classList.add('is-active-pillar');
					if (vid) {
						vid.muted = true;
						vid.loop = true;
						vid.playsInline = true;
						var p = vid.play();
						if (p && typeof p.catch === 'function') p.catch(function () {});
					}
				} else {
					pillar.classList.remove('is-active-pillar');
					if (vid) vid.pause();
				}
			});
		}

		// Móvil / Tablet: flujo vertical limpio sin pin
		if (window.innerWidth < 1025) {
			if (pillarsWrap) {
				ScrollTrigger.create({
					trigger: pillarsWrap,
					start: 'top 75%',
					end: 'bottom 25%',
					onEnter: function () { setActivePillar(0); },
					onUpdate: function (self) {
						if (self.progress < 0.34) setActivePillar(0);
						else if (self.progress < 0.68) setActivePillar(1);
						else setActivePillar(2);
					},
					onLeave: function () { setActivePillar(-1); },
					onLeaveBack: function () { setActivePillar(-1); }
				});
			}

			var mobileSeaLion = document.querySelector('.gw-sealion-swim, .g-6b29333');
			var mobileOcean = document.querySelector('.gw-ocean-scene, .g-45e7068');
			if (mobileSeaLion && mobileOcean) {
				gsap.fromTo(
					mobileSeaLion,
					{
						x: 100,
						y: -25,
						rotation: -8,
						scale: 0.3,
						opacity: 0.45,
						filter: 'blur(4px) brightness(0.75) drop-shadow(0 24px 36px rgba(1, 14, 30, 0.45))'
					},
					{
						x: 0,
						y: 0,
						rotation: 0,
						scale: 1,
						opacity: 1,
						filter: 'blur(0px) brightness(1) drop-shadow(0 24px 36px rgba(1, 14, 30, 0.45))',
						duration: 1.5,
						ease: 'power2.out',
						scrollTrigger: {
							trigger: mobileOcean,
							start: 'top 80%',
							once: true
						}
					}
				);
			}

			var mobileAboutBg = document.querySelector('.gw-parallax-bg, .g-f7a815f');
			if (mobileAboutBg) {
				var mobileAboutScene = mobileAboutBg.closest('.gw-scene, .g-ede2985') || mobileAboutBg.parentElement;
				gsap.fromTo(
					mobileAboutBg,
					{ yPercent: -10, scale: 1.1 },
					{
						yPercent: 10,
						scale: 1,
						ease: 'none',
						scrollTrigger: {
							trigger: mobileAboutScene,
							start: 'top bottom',
							end: 'bottom top',
							scrub: true
						}
					}
				);
			}

			return { scenes: allScenes, masterTrigger: null, setDotCallback: null };
		}

		// Escritorio: envolver las escenas en .gw-stage y montar cada una encima de la actual
		var stage = document.createElement('div');
		stage.className = 'gw-stage';
		allScenes[0].parentNode.insertBefore(stage, allScenes[0]);

		allScenes.forEach(function (scene, idx) {
			stage.appendChild(scene);
			gsap.set(scene, {
				zIndex: idx + 1,
				yPercent: idx === 0 ? 0 : 100
			});
		});

		var heroScene = allScenes[0];
		var heroVideo = heroScene ? heroScene.querySelector('video, .elementor-background-video-container') : null;
		var heroVideoEl = heroScene ? heroScene.querySelector('video') : null;

		var oceanScene = document.querySelector('.gw-ocean-scene, .g-45e7068');
		var oceanVideoEl = oceanScene ? oceanScene.querySelector('video') : null;
		var seaLion = oceanScene ? oceanScene.querySelector('.gw-sealion-swim, .g-6b29333') : null;
		var seaLionEntered = false;

		if (seaLion) {
			gsap.set(seaLion, {
				x: 150,
				y: -30,
				rotation: -10,
				scale: 0.25,
				opacity: 0.4,
				filter: 'blur(5px) brightness(0.7) drop-shadow(0 24px 36px rgba(1, 14, 30, 0.45))'
			});
		}

		var aboutBg = document.querySelector('.gw-parallax-bg, .g-f7a815f');
		if (aboutBg) {
			gsap.set(aboutBg, { yPercent: -10, scale: 1.12 });
		}

		var state = { scenes: allScenes, masterTrigger: null, setDotCallback: null };

		var tl = gsap.timeline({
			scrollTrigger: {
				trigger: stage,
				start: 'top top',
				end: '+=480%',
				pin: true,
				pinSpacing: true,
				scrub: 0.65,
				anticipatePin: 1,
				onUpdate: function (self) {
					var p = self.progress;

					// Pilares secuenciales 1 -> 2 -> 3 mientras la escena 2 está en pantalla
					if (pillars.length) {
						if (p < 0.14) {
							setActivePillar(-1);
						} else if (p < 0.31) {
							setActivePillar(0);
						} else if (p < 0.44) {
							setActivePillar(1);
						} else if (p < 0.60) {
							setActivePillar(2);
						} else {
							setActivePillar(-1);
						}
					}

					// Entrada única de la foca desde el fondo del mar (no se revierte al bajar a About Us)
					if (seaLion && !seaLionEntered && p >= 0.58) {
						seaLionEntered = true;
						gsap.to(seaLion, {
							x: 0,
							y: 0,
							rotation: 0,
							scale: 1,
							opacity: 1,
							filter: 'blur(0px) brightness(1) drop-shadow(0 24px 36px rgba(1, 14, 30, 0.45))',
							duration: 1.5,
							ease: 'power2.out'
						});
					}

					// Pausar videos fuera de vista para mantener fluidez
					if (heroVideoEl) {
						heroVideoEl.muted = true;
						heroVideoEl.playsInline = true;
						if (p < 0.22) {
							if (heroVideoEl.paused) {
								var hp = heroVideoEl.play();
								if (hp && typeof hp.catch === 'function') hp.catch(function () {});
							}
						} else if (!heroVideoEl.paused) {
							heroVideoEl.pause();
						}
					}

					if (oceanVideoEl) {
						oceanVideoEl.muted = true;
						oceanVideoEl.playsInline = true;
						if (p >= 0.52 && p < 0.96) {
							if (oceanVideoEl.paused) {
								var op = oceanVideoEl.play();
								if (op && typeof op.catch === 'function') op.catch(function () {});
							}
						} else if (!oceanVideoEl.paused) {
							oceanVideoEl.pause();
						}
					}

					// Actualizar indicador lateral de escenas
					if (state.setDotCallback) {
						if (p < 0.14) state.setDotCallback(0);
						else if (p < 0.62) state.setDotCallback(1);
						else if (p < 0.88) state.setDotCallback(2);
						else state.setDotCallback(3);
					}
				}
			}
		});

		state.masterTrigger = tl.scrollTrigger;

		// 0.00 -> 0.18: Escena 2 (Pilares) se monta encima del Hero
		if (allScenes[1]) {
			tl.to(allScenes[1], { yPercent: 0, ease: 'none', duration: 0.18 }, 0);
		}
		if (heroVideo) {
			tl.to(heroVideo, { scale: 1.06, ease: 'none', duration: 0.18 }, 0);
		}

		// 0.18 -> 0.56: Pausa en Pilares para recorrer 1 -> 2 -> 3
		tl.to({}, { duration: 0.38 }, 0.18);

		// 0.56 -> 0.72: Escena 3 (Mar del Lobo) se monta encima de Pilares
		if (allScenes[2]) {
			tl.to(allScenes[2], { yPercent: 0, ease: 'none', duration: 0.16 }, 0.56);
		}

		// 0.72 -> 0.84: Pausa en Mar del Lobo para formulario e interacción
		tl.to({}, { duration: 0.12 }, 0.72);

		// 0.84 -> 1.00: Escena 4 (About Us) se monta encima del Mar + Parallax en foto de Roberta y Cristina
		if (allScenes[3]) {
			tl.to(allScenes[3], { yPercent: 0, ease: 'none', duration: 0.16 }, 0.84);
		}
		if (aboutBg) {
			tl.to(aboutBg, { yPercent: 0, scale: 1, ease: 'none', duration: 0.16 }, 0.84);
		}

		return state;
	}

	/**
	 * Entorno submarino vivo (burbujas/partículas) + nado continuo e interacción con el mouse.
	 */
	function initOceanScene() {
		var oceanScene = document.querySelector('.gw-ocean-scene, .g-45e7068');
		if (!oceanScene) {
			return;
		}

		// 1. Canvas de partículas / burbujas submarinas ligeras
		var canvas = document.createElement('canvas');
		canvas.className = 'gw-ocean-canvas';
		oceanScene.insertBefore(canvas, oceanScene.firstChild);

		var ctx = canvas.getContext('2d');
		var particles = [];
		var animFrame = null;
		var isVisible = false;

		function resizeCanvas() {
			canvas.width = oceanScene.offsetWidth;
			canvas.height = oceanScene.offsetHeight;
		}

		function createParticles() {
			particles = [];
			var count = Math.min(36, Math.floor((canvas.width * canvas.height) / 38000));
			for (var i = 0; i < count; i++) {
				particles.push({
					x: Math.random() * canvas.width,
					y: Math.random() * canvas.height,
					r: Math.random() * 2.6 + 0.8,
					speedY: Math.random() * 0.45 + 0.15,
					drift: (Math.random() - 0.5) * 0.35,
					alpha: Math.random() * 0.45 + 0.15
				});
			}
		}

		function drawParticles() {
			if (!isVisible) return;
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			for (var i = 0; i < particles.length; i++) {
				var p = particles[i];
				p.y -= p.speedY;
				p.x += p.drift + Math.sin(p.y * 0.015) * 0.2;

				if (p.y < -10) {
					p.y = canvas.height + 10;
					p.x = Math.random() * canvas.width;
				}
				if (p.x < -10) p.x = canvas.width + 10;
				if (p.x > canvas.width + 10) p.x = -10;

				ctx.beginPath();
				ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
				ctx.fillStyle = 'rgba(185, 238, 255, ' + p.alpha + ')';
				ctx.fill();
			}

			animFrame = requestAnimationFrame(drawParticles);
		}

		resizeCanvas();
		createParticles();
		window.addEventListener('resize', function () {
			resizeCanvas();
			createParticles();
		});

		if ('IntersectionObserver' in window) {
			var observer = new IntersectionObserver(
				function (entries) {
					entries.forEach(function (entry) {
						isVisible = entry.isIntersecting;
						if (isVisible) {
							if (!animFrame) drawParticles();
						} else if (animFrame) {
							cancelAnimationFrame(animFrame);
							animFrame = null;
						}
					});
				},
				{ threshold: 0.05 }
			);
			observer.observe(oceanScene);
		} else {
			isVisible = true;
			drawParticles();
		}

		// 2. Nado continuo en la imagen interior + seguimiento suave al mouse
		var seaLion = oceanScene.querySelector('.gw-sealion-swim, .g-6b29333');
		if (seaLion) {
			var seaLionImg = seaLion.querySelector('img') || seaLion;
			gsap.to(seaLionImg, {
				y: -22,
				duration: 1.25,
				ease: 'sine.inOut',
				repeat: -1,
				yoyo: true
			});

			gsap.to(seaLionImg, {
				rotation: 7,
				duration: 1.55,
				ease: 'sine.inOut',
				repeat: -1,
				yoyo: true,
				delay: 0.2
			});

			gsap.to(seaLionImg, {
				scaleX: 1.03,
				scaleY: 0.97,
				duration: 1.1,
				ease: 'sine.inOut',
				repeat: -1,
				yoyo: true
			});

			var quickX = gsap.quickTo(seaLionImg, 'x', { duration: 0.45, ease: 'power2.out' });
			var quickHoverScale = gsap.quickTo(seaLionImg, 'scale', { duration: 0.35, ease: 'back.out(1.8)' });

			oceanScene.addEventListener('mousemove', function (e) {
				var rect = oceanScene.getBoundingClientRect();
				var relX = (e.clientX - rect.left) / rect.width - 0.5;
				quickX(relX * -80);
			});

			seaLion.addEventListener('mouseenter', function () {
				quickHoverScale(1.16);
				quickX(-30);
			});

			seaLion.addEventListener('mouseleave', function () {
				quickHoverScale(1);
			});
		}
	}

	/**
	 * Crea puntos discretos laterales para navegar entre escenas y conecta botones #plan-your-trip.
	 */
	function initDepthNavigation(lenis, stageInfo) {
		var scenes = stageInfo && stageInfo.scenes ? stageInfo.scenes : [];
		if (scenes.length < 2) {
			return;
		}

		var nav = document.createElement('nav');
		nav.className = 'gw-depth-nav';
		nav.setAttribute('aria-label', 'Navegación de escenas');

		var dots = [];
		var desktopOffsets = [0, 0.24, 0.76, 1.0];

		function scrollToSceneIndex(index) {
			if (stageInfo.masterTrigger) {
				var st = stageInfo.masterTrigger;
				var progressTarget = desktopOffsets[index] !== undefined ? desktopOffsets[index] : index / (scenes.length - 1);
				var targetY = st.start + (st.end - st.start) * progressTarget;
				if (lenis) {
					lenis.scrollTo(targetY, { duration: 1.25 });
				} else {
					window.scrollTo({ top: targetY, behavior: 'smooth' });
				}
			} else if (scenes[index]) {
				if (lenis) {
					lenis.scrollTo(scenes[index], { duration: 1.2 });
				} else {
					scenes[index].scrollIntoView({ behavior: 'smooth' });
				}
			}
		}

		scenes.forEach(function (scene, index) {
			var dot = document.createElement('button');
			dot.type = 'button';
			dot.className = 'gw-depth-dot' + (index === 0 ? ' is-active' : '');
			dot.setAttribute('aria-label', 'Ir a escena ' + (index + 1));

			dot.addEventListener('click', function () {
				scrollToSceneIndex(index);
			});

			nav.appendChild(dot);
			dots.push(dot);

			if (!stageInfo.masterTrigger) {
				ScrollTrigger.create({
					trigger: scene,
					start: 'top center',
					end: 'bottom center',
					onEnter: function () { setActiveDot(index); },
					onEnterBack: function () { setActiveDot(index); }
				});
			}
		});

		function setActiveDot(activeIndex) {
			dots.forEach(function (d, i) {
				d.classList.toggle('is-active', i === activeIndex);
			});
		}

		if (stageInfo) {
			stageInfo.setDotCallback = setActiveDot;
		}

		document.body.appendChild(nav);

		// Conectar botón PLAN YOUR TRIP hacia la escena del mar + formulario (índice 2)
		document.querySelectorAll('a[href="#plan-your-trip"]').forEach(function (link) {
			link.addEventListener('click', function (e) {
				e.preventDefault();
				scrollToSceneIndex(2);
			});
		});
	}

	/**
	 * Envío AJAX del formulario [galway_trip_quiz] sin recargar la página.
	 */
	function initTripQuiz() {
		var form = document.querySelector('.gw-quiz-form');
		if (!form || typeof galwayAnimConfig === 'undefined') return;

		form.addEventListener('submit', function (e) {
			e.preventDefault();
			var msgEl = form.querySelector('.gw-quiz-msg');
			var submitBtn = form.querySelector('.gw-quiz-submit');
			var data = new FormData(form);
			data.append('action', 'galway_quiz_submit');
			data.append('nonce', galwayAnimConfig.nonce);

			if (submitBtn) submitBtn.disabled = true;
			if (msgEl) msgEl.textContent = 'Sending...';

			fetch(galwayAnimConfig.ajaxUrl, {
				method: 'POST',
				body: data
			})
				.then(function (r) {
					return r.json();
				})
				.then(function (res) {
					if (msgEl) {
						msgEl.textContent = (res.data && res.data.message) ? res.data.message : 'Thank you!';
					}
					if (res.success) {
						form.reset();
					}
				})
				.catch(function () {
					if (msgEl) msgEl.textContent = 'Connection error. Please try again.';
				})
				.finally(function () {
					if (submitBtn) submitBtn.disabled = false;
				});
		});
	}
})();
