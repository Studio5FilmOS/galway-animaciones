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

		var stageInfo = { scenes: [], masterTrigger: null, setDotCallback: null, setOceanAudioCallback: null, scrollToScene: null };

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

		state = state || {};
		state.scenes = allScenes;

		// Páginas dedicadas de 1 sola escena (Plan Your Trip o About Us)
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

			return state;
		}

		// Escritorio: envolver las 4 escenas de Home en .gw-stage (el Footer queda fuera debajo)
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

		var iguanaBg = document.querySelector('.gw-parallax-bg, .g-f7a815f');
		if (iguanaBg) {
			gsap.set(iguanaBg, { yPercent: -10, scale: 1.12 });
		}

		var tl = gsap.timeline({
			scrollTrigger: {
				trigger: stage,
				start: 'top top',
				end: '+=460%',
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

					// Pausar video del Hero fuera de vista
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

		// 0.56 -> 0.72: Escena 3 (Iguana Manifesto) se monta encima de Pilares con parallax suave
		if (allScenes[2]) {
			tl.to(allScenes[2], { yPercent: 0, ease: 'none', duration: 0.16 }, 0.56);
		}
		if (iguanaBg) {
			tl.to(iguanaBg, { yPercent: 0, scale: 1, ease: 'none', duration: 0.16 }, 0.56);
		}

		// 0.72 -> 0.84: Pausa breve en Iguana Manifesto
		tl.to({}, { duration: 0.12 }, 0.72);

		// 0.84 -> 1.00: Escena 4 (Traveler Experiences) se monta encima de Iguana
		if (allScenes[3]) {
			tl.to(allScenes[3], { yPercent: 0, ease: 'none', duration: 0.16 }, 0.84);
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
		var desktopOffsets = [0, 0.24, 0.74, 1.0];

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
