/**
 * Galway Animaciones Inmersivas v2.5.0
 * Escenario Maestro de cortinas apiladas (Home) + páginas dedicadas (Plan Your Trip & About Us)
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
				duration: 1.45,
				easing: function (t) {
					return Math.min(1, 1.001 - Math.pow(2, -10 * t));
				},
				smoothWheel: true,
				wheelMultiplier: 0.72
			});

			lenis.on('scroll', ScrollTrigger.update);

			gsap.ticker.add(function (time) {
				lenis.raf(time * 1000);
			});
			gsap.ticker.lagSmoothing(0);
		} else if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
			gsap.registerPlugin(ScrollTrigger);
		}

		var stageInfo = { scenes: [], desktopOffsets: null, masterTrigger: null, setDotCallback: null, setOceanAudioCallback: null, scrollToScene: null };

		// 1b. Header fijo global con glassmorphism al hacer scroll
		initFixedHeader(lenis);

		// 2. Menú Sánduche Overlay + Panel de 4 tarjetas (JOURNEYS)
		initMenuOverlay(lenis);

		// 3. Envío AJAX del formulario [galway_trip_quiz]
		initTripQuiz();

		if (reducedMotion || typeof gsap === 'undefined') {
			return;
		}

		// 4. Escenario Maestro de cortinas montadas en Home (o animación de página dedicada)
		stageInfo = initMasterStage(lenis, stageInfo);

		// 5. Entorno submarino (burbujas/partículas) + nado sutil del lobo marino
		initOceanScene();

		// 6. Indicador lateral de escenas
		initDepthNavigation(lenis, stageInfo);

		// 7. Audio ambiental (Superficie / Submarino) con crossfade suave
		initAmbientAudio(stageInfo);
	});

	/**
	 * Fija el header oficial de Galway en todas las páginas y activa glassmorphism al hacer scroll.
	 */
	function initFixedHeader(lenis) {
		var header = document.querySelector('.gw-header-glass, .g-112c2c1, [data-id="22da55f4"], [data-id="69ca67f5"], [data-id="7eb563f8"]');
		if (!header || header.classList.contains('gw-header-fixed')) {
			return;
		}

		var headerHeight = header.offsetHeight || 0;
		var parent = header.parentNode;
		if (parent && headerHeight > 0) {
			var spacer = document.createElement('div');
			spacer.className = 'gw-header-spacer';
			spacer.setAttribute('aria-hidden', 'true');
			spacer.style.height = headerHeight + 'px';
			parent.insertBefore(spacer, header);
		}

		var rootContainer = header.closest('.elementor') || document.body;
		rootContainer.insertBefore(header, rootContainer.firstChild);
		header.classList.add('gw-header-fixed');

		function syncHeaderState(scrollEvt) {
			var y = (scrollEvt && typeof scrollEvt.scroll === 'number')
				? scrollEvt.scroll
				: (window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0);
			header.classList.toggle('is-scrolled', y > 24);
		}

		syncHeaderState();
		window.addEventListener('scroll', function () {
			syncHeaderState();
		}, { passive: true });

		if (lenis && typeof lenis.on === 'function') {
			lenis.on('scroll', syncHeaderState);
		}
	}

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
			overlay.classList.add('journeys-active');
			document.body.classList.add('gw-menu-open');
			if (lenis) lenis.stop();
		}

		function closeMenu(e) {
			if (e) e.preventDefault();
			overlay.classList.remove('is-open');
			overlay.classList.remove('journeys-active');
			document.body.classList.remove('gw-menu-open');
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

		overlay.addEventListener('click', function (e) {
			if (e.target === overlay) {
				closeMenu(e);
			}
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
	 * Orquesta el escenario maestro en Home (4 cortinas) o las páginas dedicadas (Plan Your Trip / About Us).
	 */
	function initMasterStage(lenis, state) {
		var allScenes = gsap.utils.toArray('.gw-scene, .g-ede2985').filter(function (el) {
			return !el.classList.contains('gw-menu-overlay') && !el.classList.contains('g-e1203d2');
		});
		var footerEl = document.querySelector('[data-id="28221e0a"], .elementor-element-28221e0a, .gw-footer-scene, .g-1a0a9f6');

		function animateJourneyBandsInScene(scene) {
			if (!scene || scene.dataset.gwJourneyAnimated === '1') return;
			var bands = scene.querySelectorAll('.gw-journey-band, .g-94d1e9f');
			if (!bands.length) return;
			scene.dataset.gwJourneyAnimated = '1';

			var contents = scene.querySelectorAll('.gw-journey-content, .g-04a6590');
			if (contents.length) {
				gsap.fromTo(
					contents,
					{ y: 22, opacity: 0 },
					{
						y: 0,
						opacity: 1,
						duration: 0.65,
						stagger: 0.14,
						ease: 'power3.out'
					}
				);
			}

			var photos = scene.querySelectorAll('.gw-journey-photo, .g-f3be2a4');
			if (photos.length) {
				gsap.fromTo(
					photos,
					{ scale: 1.07 },
					{
						scale: 1,
						duration: 1.15,
						stagger: 0.1,
						ease: 'power2.out'
					}
				);
			}
		}

		state = state || {};
		state.scenes = allScenes;

		// Caso A: Páginas dedicadas de 1 sola escena (Plan Your Trip o About Us) + Footer cortina
		if (allScenes.length < 2) {
			var singleOcean = document.querySelector('.gw-ocean-scene, .g-45e7068');
			var singleSeaLion = singleOcean ? singleOcean.querySelector('.gw-sealion-swim, .g-6b29333') : null;
			if (singleSeaLion) {
				var singleWrap = wrapSeaLion(singleSeaLion);
				gsap.fromTo(
					singleWrap,
					{
						x: 90,
						y: -18,
						rotation: -4,
						scale: 0.48,
						opacity: 0.45,
						filter: 'blur(3px) brightness(0.75)'
					},
					{
						x: 0,
						y: 0,
						rotation: 0,
						scale: 1,
						opacity: 1,
						filter: 'blur(0px) brightness(1)',
						duration: 1.5,
						delay: 0.25,
						ease: 'power2.out'
					}
				);
			}

			var singleParallax = document.querySelector('.gw-parallax-bg, .g-f7a815f');
			if (singleParallax) {
				gsap.fromTo(
					singleParallax,
					{ scale: 1.07, yPercent: -2 },
					{ scale: 1, yPercent: 0, duration: 2.2, ease: 'power2.out' }
				);
			}

			if (allScenes[0]) {
				animateJourneyBandsInScene(allScenes[0]);
			}

			if (footerEl && allScenes[0] && window.innerWidth >= 1025) {
				var singleStage = document.createElement('div');
				singleStage.className = 'gw-stage';
				allScenes[0].parentNode.insertBefore(singleStage, allScenes[0]);
				singleStage.appendChild(allScenes[0]);
				gsap.set(allScenes[0], { zIndex: 1, yPercent: 0 });

				footerEl.classList.add('gw-footer-curtain');
				singleStage.appendChild(footerEl);
				gsap.set(footerEl, { zIndex: 2, yPercent: 102 });

				state.scenes = [allScenes[0], footerEl];
				state.desktopOffsets = [0, 1];

				var singleTl = gsap.timeline({
					scrollTrigger: {
						trigger: singleStage,
						start: 'top top',
						end: '+=140%',
						pin: true,
						pinSpacing: true,
						scrub: 0.9,
						anticipatePin: 1,
						onUpdate: function (self) {
							if (state.setDotCallback) {
								state.setDotCallback(self.progress < 0.5 ? 0 : 1);
							}
						}
					}
				});

				state.masterTrigger = singleTl.scrollTrigger;
				singleTl.to({}, { duration: 0.12 }, 0);
				singleTl.to(footerEl, { yPercent: 0, ease: 'none', duration: 0.80 }, 0.12);
				singleTl.to({}, { duration: 0.08 }, 0.92);
			}

			return state;
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

		var reviewsAnimated = false;
		function triggerReviewsAnimation() {
			if (reviewsAnimated) return;
			reviewsAnimated = true;

			var ratingEl = document.querySelector('[data-id="6d8a8986"]');
			var ratingTarget = ratingEl ? (ratingEl.querySelector('p') || ratingEl) : null;
			if (ratingTarget) {
				var ratingCounter = { val: 0 };
				gsap.to(ratingCounter, {
					val: 4.9,
					duration: 1.2,
					ease: 'power2.out',
					onUpdate: function () {
						ratingTarget.textContent = ratingCounter.val.toFixed(1);
					}
				});
			}

			var countEl = document.querySelector('[data-id="189dae41"]');
			var countTarget = countEl ? (countEl.querySelector('p') || countEl) : null;
			if (countTarget) {
				var countCounter = { val: 0 };
				gsap.to(countCounter, {
					val: 127,
					duration: 1.3,
					ease: 'power2.out',
					onUpdate: function () {
						countTarget.textContent = Math.round(countCounter.val) + ' reviews';
					}
				});
			}

			var stars = document.querySelectorAll('[data-id="55e82289"] > *');
			if (stars.length) {
				gsap.fromTo(
					stars,
					{ scale: 0, opacity: 0, rotation: -18 },
					{
						scale: 1,
						opacity: 1,
						rotation: 0,
						duration: 0.45,
						stagger: 0.08,
						ease: 'back.out(2.2)'
					}
				);
			}

			var verifiedIcon = document.querySelector('[data-id="322de734"]');
			if (verifiedIcon) {
				gsap.fromTo(
					verifiedIcon,
					{ scale: 0, rotation: -25, opacity: 0 },
					{
						scale: 1,
						rotation: 0,
						opacity: 1,
						duration: 0.65,
						delay: 0.35,
						ease: 'back.out(2)',
						onComplete: function () {
							verifiedIcon.classList.add('gw-verified-pulse');
						}
					}
				);
			}

			var reviewCards = document.querySelectorAll('[data-id="5050a2d8"], [data-id="127ea8ca"], [data-id="6100e690"]');
			if (reviewCards.length) {
				gsap.fromTo(
					reviewCards,
					{ y: 28, opacity: 0 },
					{
						y: 0,
						opacity: 1,
						duration: 0.65,
						stagger: 0.12,
						delay: 0.2,
						ease: 'power3.out'
					}
				);
			}
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

			var mobileParallaxBg = document.querySelector('.gw-parallax-bg, .g-f7a815f');
			if (mobileParallaxBg) {
				var mobileParallaxScene = mobileParallaxBg.closest('.gw-scene, .g-ede2985') || mobileParallaxBg.parentElement;
				gsap.fromTo(
					mobileParallaxBg,
					{ yPercent: -10, scale: 1.1 },
					{
						yPercent: 10,
						scale: 1,
						ease: 'none',
						scrollTrigger: {
							trigger: mobileParallaxScene,
							start: 'top bottom',
							end: 'bottom top',
							scrub: true
						}
					}
				);
			}

			var mobileIguanaScene = allScenes[2];
			var mobileIguanaVideo = mobileIguanaScene ? mobileIguanaScene.querySelector('video') : null;
			if (mobileIguanaVideo && 'IntersectionObserver' in window) {
				mobileIguanaVideo.muted = true;
				mobileIguanaVideo.loop = true;
				mobileIguanaVideo.playsInline = true;
				mobileIguanaVideo.pause();
				var mObs = new IntersectionObserver(
					function (entries) {
						entries.forEach(function (entry) {
							if (entry.isIntersecting) {
								var mp = mobileIguanaVideo.play();
								if (mp && typeof mp.catch === 'function') mp.catch(function () {});
							} else {
								mobileIguanaVideo.pause();
							}
						});
					},
					{ threshold: 0.2 }
				);
				mObs.observe(mobileIguanaScene);
			}

			if (allScenes[3]) {
				ScrollTrigger.create({
					trigger: allScenes[3],
					start: 'top 78%',
					once: true,
					onEnter: triggerReviewsAnimation
				});
			}

			allScenes.forEach(function (scene) {
				if (scene.querySelector('.gw-journey-band, .g-94d1e9f')) {
					ScrollTrigger.create({
						trigger: scene,
						start: 'top 78%',
						once: true,
						onEnter: function () {
							animateJourneyBandsInScene(scene);
						}
					});
				}
			});

			return state;
		}

		// Escritorio: envolver escenas + Footer en .gw-stage (cortinas apiladas)
		var stage = document.createElement('div');
		stage.className = 'gw-stage';
		allScenes[0].parentNode.insertBefore(stage, allScenes[0]);

		var curtains = allScenes.slice();
		allScenes.forEach(function (scene, idx) {
			stage.appendChild(scene);
			gsap.set(scene, {
				zIndex: idx + 1,
				yPercent: idx === 0 ? 0 : 102
			});
		});

		if (footerEl) {
			footerEl.classList.add('gw-footer-curtain');
			stage.appendChild(footerEl);
			gsap.set(footerEl, {
				zIndex: allScenes.length + 1,
				yPercent: 102
			});
			curtains.push(footerEl);
		}
		state.scenes = curtains;

		// Caso C: Página multi-escena genérica (ej. Journeys con tarjetas 2 en 2 + Footer)
		if (!pillarsWrap) {
			var totalCurtains = curtains.length;
			var segments = [];
			var cursor = 0.25;

			for (var cIdx = 1; cIdx < totalCurtains; cIdx++) {
				var sStart = cursor;
				var sDur = 0.55;
				var hDur = (cIdx === totalCurtains - 1) ? 0.10 : 0.45;
				segments.push({
					index: cIdx,
					el: curtains[cIdx],
					start: sStart,
					end: sStart + sDur
				});
				cursor += sDur + hDur;
			}

			var totalUnits = cursor;
			var genOffsets = [0];
			var enterThresholds = [0];
			segments.forEach(function (seg) {
				genOffsets.push(seg.index === totalCurtains - 1 ? 1 : seg.end / totalUnits);
				enterThresholds.push(seg.start / totalUnits + 0.01);
			});
			state.desktopOffsets = genOffsets;

			animateJourneyBandsInScene(curtains[0]);

			var genTl = gsap.timeline({
				scrollTrigger: {
					trigger: stage,
					start: 'top top',
					end: '+=' + Math.round((totalCurtains - 1) * 145) + '%',
					pin: true,
					pinSpacing: true,
					scrub: 0.95,
					anticipatePin: 1,
					onUpdate: function (self) {
						var p = self.progress;
						var activeIdx = 0;

						for (var k = 1; k < enterThresholds.length; k++) {
							if (p >= enterThresholds[k]) {
								activeIdx = k;
								animateJourneyBandsInScene(curtains[k]);
							}
						}

						if (state.setDotCallback) {
							state.setDotCallback(activeIdx);
						}
					}
				}
			});

			state.masterTrigger = genTl.scrollTrigger;
			genTl.to({}, { duration: 0.25 }, 0);
			segments.forEach(function (seg) {
				genTl.to(seg.el, { yPercent: 0, ease: 'none', duration: seg.end - seg.start }, seg.start);
			});
			genTl.to({}, { duration: Math.max(0.05, totalUnits - (segments.length ? segments[segments.length - 1].end : 0.25)) }, segments.length ? segments[segments.length - 1].end : 0.25);

			return state;
		}

		// Caso B: Escenario Maestro Home (5 cortinas: Hero, Pilares, Iguana, Reviews, Footer)
		state.desktopOffsets = [0, 0.20, 0.66, 0.86, 1.0];

		var heroScene = allScenes[0];
		var heroVideo = heroScene ? heroScene.querySelector('video, .elementor-background-video-container') : null;
		var heroVideoEl = heroScene ? heroScene.querySelector('video') : null;

		var iguanaBg = document.querySelector('.gw-parallax-bg, .g-f7a815f');
		if (iguanaBg) {
			gsap.set(iguanaBg, { yPercent: -10, scale: 1.12 });
		}

		var iguanaVideoEl = allScenes[2] ? allScenes[2].querySelector('video') : null;
		if (iguanaVideoEl) {
			iguanaVideoEl.muted = true;
			iguanaVideoEl.loop = true;
			iguanaVideoEl.playsInline = true;
			iguanaVideoEl.pause();
		}

		var tl = gsap.timeline({
			scrollTrigger: {
				trigger: stage,
				start: 'top top',
				end: '+=800%',
				pin: true,
				pinSpacing: true,
				scrub: 0.95,
				anticipatePin: 1,
				onUpdate: function (self) {
					var p = self.progress;

					// Pilares secuenciales 1 -> 2 -> 3 con ~100vh por video
					if (pillars.length) {
						if (p < 0.12) {
							setActivePillar(-1);
						} else if (p < 0.27) {
							setActivePillar(0);
						} else if (p < 0.40) {
							setActivePillar(1);
						} else if (p < 0.54) {
							setActivePillar(2);
						} else {
							setActivePillar(-1);
						}
					}

					// Pausar video del Hero fuera de vista
					if (heroVideoEl) {
						heroVideoEl.muted = true;
						heroVideoEl.playsInline = true;
						if (p < 0.16) {
							if (heroVideoEl.paused) {
								var hp = heroVideoEl.play();
								if (hp && typeof hp.catch === 'function') hp.catch(function () {});
							}
						} else if (!heroVideoEl.paused) {
							heroVideoEl.pause();
						}
					}

					// Reproducir video de Iguana solo al llegar con el scroll y pausar al salir
					if (iguanaVideoEl) {
						if (p >= 0.50 && p < 0.84) {
							if (iguanaVideoEl.paused) {
								var ip = iguanaVideoEl.play();
								if (ip && typeof ip.catch === 'function') ip.catch(function () {});
							}
						} else if (!iguanaVideoEl.paused) {
							iguanaVideoEl.pause();
						}
					}

					if (p >= 0.75) {
						triggerReviewsAnimation();
					}

					// Actualizar indicador lateral de escenas
					if (state.setDotCallback) {
						if (p < 0.10) state.setDotCallback(0);
						else if (p < 0.56) state.setDotCallback(1);
						else if (p < 0.78) state.setDotCallback(2);
						else if (p < 0.94) state.setDotCallback(3);
						else state.setDotCallback(4);
					}
				}
			}
		});

		state.masterTrigger = tl.scrollTrigger;

		// 0.00 -> 0.04: Pausa inicial en Hero (protege boton PLAN YOUR TRIP y WhatsApp al cargar)
		tl.to({}, { duration: 0.04 }, 0);

		// 0.04 -> 0.14: Escena 2 (Pilares) se monta encima del Hero
		if (allScenes[1]) {
			tl.to(allScenes[1], { yPercent: 0, ease: 'none', duration: 0.10 }, 0.04);
		}
		if (heroVideo) {
			tl.to(heroVideo, { scale: 1.06, ease: 'none', duration: 0.10 }, 0.04);
		}

		// 0.14 -> 0.52: Pausa amplia en Pilares (~100vh por cada uno de los 3 videos)
		tl.to({}, { duration: 0.38 }, 0.14);

		// 0.52 -> 0.62: Escena 3 (Iguana Manifesto) se monta encima de Pilares con parallax suave
		if (allScenes[2]) {
			tl.to(allScenes[2], { yPercent: 0, ease: 'none', duration: 0.10 }, 0.52);
		}
		if (iguanaBg) {
			tl.to(iguanaBg, { yPercent: 0, scale: 1, ease: 'none', duration: 0.10 }, 0.52);
		}

		// 0.62 -> 0.72: Pausa en Iguana Manifesto
		tl.to({}, { duration: 0.10 }, 0.62);

		// 0.72 -> 0.82: Escena 4 (Traveler Experiences) se monta encima de Iguana
		if (allScenes[3]) {
			tl.to(allScenes[3], { yPercent: 0, ease: 'none', duration: 0.10 }, 0.72);
		}

		// 0.82 -> 0.90: Pausa limpia para leer Traveler Experiences
		tl.to({}, { duration: 0.08 }, 0.82);

		// 0.90 -> 1.00: Escena 5 (Footer) se monta encima de Traveler Experiences
		if (footerEl) {
			tl.to(footerEl, { yPercent: 0, ease: 'none', duration: 0.10 }, 0.90);
		}

		return state;
	}

	/**
	 * Entorno submarino vivo (burbujas/partículas) + nado continuo sutil del lobo marino PNG.
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

		// 2. Nado continuo muy sutil en el <img> interior + seguimiento suave al mouse
		var seaLion = oceanScene.querySelector('.gw-sealion-swim, .g-6b29333');
		if (seaLion) {
			wrapSeaLion(seaLion);

			gsap.to(seaLion, {
				y: -8,
				duration: 3.2,
				ease: 'sine.inOut',
				repeat: -1,
				yoyo: true
			});

			gsap.to(seaLion, {
				rotation: 2.2,
				duration: 4.2,
				ease: 'sine.inOut',
				repeat: -1,
				yoyo: true,
				delay: 0.3
			});

			var quickX = gsap.quickTo(seaLion, 'x', { duration: 1.1, ease: 'power2.out' });
			var quickHoverScale = gsap.quickTo(seaLion, 'scale', { duration: 0.6, ease: 'power2.out' });

			oceanScene.addEventListener('mousemove', function (e) {
				var rect = oceanScene.getBoundingClientRect();
				var relX = (e.clientX - rect.left) / rect.width - 0.5;
				quickX(relX * -22);
			});

			seaLion.addEventListener('mouseenter', function () {
				quickHoverScale(1.045);
			});

			seaLion.addEventListener('mouseleave', function () {
				quickHoverScale(1);
			});
		}
	}

	/**
	 * Envuelve el <img> del lobo marino en .gw-sealion-wrap una sola vez para separar entrada y flotación.
	 */
	function wrapSeaLion(el) {
		if (!el) return null;
		if (el.parentElement && el.parentElement.classList.contains('gw-sealion-wrap')) {
			return el.parentElement;
		}
		var wrap = document.createElement('div');
		wrap.className = 'gw-sealion-wrap';
		el.parentNode.insertBefore(wrap, el);
		wrap.appendChild(el);
		return wrap;
	}

	/**
	 * Crea puntos discretos laterales para navegar entre las 4 escenas de Home.
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
		var desktopOffsets = (stageInfo && stageInfo.desktopOffsets) ? stageInfo.desktopOffsets : [0, 0.20, 0.66, 0.86, 1.0];

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
			stageInfo.scrollToScene = scrollToSceneIndex;
		}

		document.body.appendChild(nav);
	}

	/**
	 * Reproductor ambiental discreto (Superficie / Submarino).
	 */
	function initAmbientAudio(stageInfo) {
		if (typeof galwayAnimConfig === 'undefined') return;

		var urlSup = galwayAnimConfig.audioSuperficie || '';
		var urlSub = galwayAnimConfig.audioSubmarino || '';
		if (!urlSup && !urlSub) return;

		var maxVol = typeof galwayAnimConfig.audioVolume === 'number' ? galwayAnimConfig.audioVolume : 0.45;
		var audioSup = urlSup ? new Audio(urlSup) : null;
		var audioSub = urlSub ? new Audio(urlSub) : null;

		[audioSup, audioSub].forEach(function (a) {
			if (!a) return;
			a.loop = true;
			a.preload = 'none';
			a.volume = 0;
		});

		var isPlaying = false;
		var inOcean = !!document.querySelector('.gw-ocean-scene, .g-45e7068');

		var btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'gw-sound-btn';
		btn.setAttribute('aria-label', 'Alternar sonido ambiental');
		btn.innerHTML = '<span class="gw-sound-bars"><span></span><span></span><span></span></span><span class="gw-sound-label">SOUND OFF</span>';
		var labelEl = btn.querySelector('.gw-sound-label');
		document.body.appendChild(btn);

		function fadeAudio(audioEl, targetVol, duration) {
			if (!audioEl) return;
			gsap.killTweensOf(audioEl);
			if (targetVol > 0 && audioEl.paused) {
				var playPromise = audioEl.play();
				if (playPromise && typeof playPromise.catch === 'function') {
					playPromise.catch(function () {});
				}
			}
			gsap.to(audioEl, {
				volume: targetVol,
				duration: duration || 1.1,
				ease: 'power2.out',
				onComplete: function () {
					if (targetVol === 0 && !audioEl.paused) {
						audioEl.pause();
					}
				}
			});
		}

		function syncAudioTracks() {
			if (!isPlaying) {
				fadeAudio(audioSup, 0, 0.5);
				fadeAudio(audioSub, 0, 0.5);
				return;
			}
			if (audioSup && audioSub) {
				fadeAudio(audioSup, inOcean ? 0 : maxVol, 1.2);
				fadeAudio(audioSub, inOcean ? maxVol : 0, 1.2);
			} else if (audioSup) {
				fadeAudio(audioSup, maxVol, 0.9);
			} else if (audioSub) {
				fadeAudio(audioSub, maxVol, 0.9);
			}
		}

		btn.addEventListener('click', function () {
			isPlaying = !isPlaying;
			btn.classList.toggle('is-playing', isPlaying);
			labelEl.textContent = isPlaying ? 'SOUND ON' : 'SOUND OFF';
			syncAudioTracks();
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
