/**
 * Galway Animaciones Inmersivas v1.0.0
 * Lenis Smooth Scroll + GSAP ScrollTrigger + Entorno Submarino + Menú Overlay
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

		// 2. Header Glassmorphism al hacer scroll
		var headerGlass = document.querySelector('.gw-header-glass, .g-112c2c1');
		if (headerGlass) {
			window.addEventListener(
				'scroll',
				function () {
					if (window.scrollY > 40) {
						headerGlass.classList.add('is-scrolled');
					} else {
						headerGlass.classList.remove('is-scrolled');
					}
				},
				{ passive: true }
			);
		}

		// 3. Menú Sánduche Overlay + Panel de 4 tarjetas (JOURNEYS)
		initMenuOverlay(lenis);

		if (reducedMotion || typeof gsap === 'undefined') {
			return;
		}

		// 4. Transiciones inmersivas por capas entre escenas (estilo Sofi Health)
		initSceneAnimations();

		// 5. Entorno submarino (burbujas/partículas) + nado del lobo marino PNG
		initOceanScene();

		// 6. Indicador lateral de escenas
		initDepthNavigation(lenis);

		// 7. Videos en hover para Pilares + pausa automática fuera de pantalla
		initSmartVideos();
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
				// En móvil o primer clic muestra el panel si no estaba activo
				if (!overlay.classList.contains('journeys-active')) {
					e.preventDefault();
					overlay.classList.add('journeys-active');
				}
			});
		}
	}

	/**
	 * Animaciones inmersivas fluidas sin apagones entre escenas.
	 */
	function initSceneAnimations() {
		// Efecto sutil de parallax en el video del Hero sin oscurecer la pantalla
		var heroScene = document.querySelector('.gw-hero-scene, .g-8364edf');
		if (heroScene) {
			var heroVideo = heroScene.querySelector('video, .elementor-background-video-container');
			if (heroVideo) {
				gsap.to(heroVideo, {
					scale: 1.07,
					yPercent: 8,
					ease: 'none',
					scrollTrigger: {
						trigger: heroScene,
						start: 'top top',
						end: 'bottom top',
						scrub: true
					}
				});
			}
		}

		// Pilares (EXPLORE · DISCOVER · LEARN): secuencia automática al hacer scroll (1 -> 2 -> 3)
		initScrollPillars();

		// Elementos con aparición suave (.gw-reveal)
		gsap.utils.toArray('.gw-reveal, .g-4602df4').forEach(function (el) {
			gsap.from(el, {
				y: 36,
				opacity: 0,
				duration: 0.95,
				ease: 'power3.out',
				scrollTrigger: {
					trigger: el,
					start: 'top 84%',
					once: true
				}
			});
		});

		// Grupos escalonados (.gw-stagger)
		gsap.utils.toArray('.gw-stagger, .g-d95dc89').forEach(function (container) {
			var items = container.querySelectorAll(':scope > .e-con, :scope > .elementor-widget, :scope > .elementor-element');
			if (!items.length) return;

			gsap.from(items, {
				y: 30,
				opacity: 0,
				duration: 0.85,
				stagger: 0.14,
				ease: 'power3.out',
				scrollTrigger: {
					trigger: container,
					start: 'top 80%',
					once: true
				}
			});
		});
	}

	/**
	 * Entorno submarino vivo (burbujas/partículas) + nado orgánico del lobo marino PNG.
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

		// Pausar canvas cuando la escena no está en pantalla para ahorrar batería/CPU
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

		// 2. Animación orgánica del Lobo Marino PNG (sensación real de nado bajo el agua)
		var seaLion = oceanScene.querySelector('.gw-sealion-swim, .g-6b29333');
		if (seaLion) {
			// Trayectoria curva de nado ligada al scroll
			var swimTimeline = gsap.timeline({
				scrollTrigger: {
					trigger: oceanScene,
					start: 'top bottom',
					end: 'bottom top',
					scrub: 1.4
				}
			});

			swimTimeline
				.fromTo(
					seaLion,
					{ x: 130, y: 55, rotation: -9, scale: 0.84, opacity: 0.3 },
					{ x: 20, y: -15, rotation: 3, scale: 1.02, opacity: 1, ease: 'sine.out', duration: 0.5 }
				)
				.to(
					seaLion,
					{ x: -35, y: -45, rotation: -3, scale: 1.08, ease: 'sine.inOut', duration: 0.5 }
				);

			// Movimiento continuo de propulsión y flotación hidrodinámica
			var seaLionImg = seaLion.querySelector('img') || seaLion;
			gsap.to(seaLionImg, {
				y: -18,
				duration: 2.4,
				ease: 'sine.inOut',
				repeat: -1,
				yoyo: true
			});

			gsap.to(seaLionImg, {
				rotation: 4.5,
				duration: 3.1,
				ease: 'sine.inOut',
				repeat: -1,
				yoyo: true,
				delay: 0.4
			});

			gsap.to(seaLionImg, {
				x: -14,
				scaleX: 1.025,
				scaleY: 0.985,
				duration: 3.6,
				ease: 'sine.inOut',
				repeat: -1,
				yoyo: true,
				delay: 0.8
			});

			// Sutil reacción al puntero en escritorio
			oceanScene.addEventListener('mousemove', function (e) {
				var rect = oceanScene.getBoundingClientRect();
				var relX = (e.clientX - rect.left) / rect.width - 0.5;

				gsap.to(seaLion, {
					xPercent: relX * -4,
					duration: 1.4,
					ease: 'power2.out',
					overwrite: 'auto'
				});
			});
		}
	}

	/**
	 * Crea puntos discretos laterales para navegar entre escenas (.gw-scene).
	 */
	function initDepthNavigation(lenis) {
		var scenes = gsap.utils.toArray('.gw-scene, .g-ede2985');
		if (scenes.length < 2) {
			return;
		}

		var nav = document.createElement('nav');
		nav.className = 'gw-depth-nav';
		nav.setAttribute('aria-label', 'Navegación de escenas');

		var dots = [];

		scenes.forEach(function (scene, index) {
			var dot = document.createElement('button');
			dot.type = 'button';
			dot.className = 'gw-depth-dot' + (index === 0 ? ' is-active' : '');
			dot.setAttribute('aria-label', 'Ir a escena ' + (index + 1));

			dot.addEventListener('click', function () {
				if (lenis) {
					lenis.scrollTo(scene, { duration: 1.2 });
				} else {
					scene.scrollIntoView({ behavior: 'smooth' });
				}
			});

			nav.appendChild(dot);
			dots.push(dot);

			ScrollTrigger.create({
				trigger: scene,
				start: 'top center',
				end: 'bottom center',
				onEnter: function () {
					setActiveDot(index);
				},
				onEnterBack: function () {
					setActiveDot(index);
				}
			});
		});

		function setActiveDot(activeIndex) {
			dots.forEach(function (d, i) {
				d.classList.toggle('is-active', i === activeIndex);
			});
		}

		document.body.appendChild(nav);
	}

	/**
	 * Activa secuencialmente EXPLORE -> DISCOVER -> LEARN al hacer scroll (sin necesitar hover).
	 */
	function initScrollPillars() {
		var pillarsWrap = document.querySelector('.gw-pillars, .g-4b09dba');
		if (!pillarsWrap || window.innerWidth < 1025) return;

		var pillars = pillarsWrap.querySelectorAll('.gw-pillar, .g-4913cbe');
		if (!pillars.length) return;

		var currentActive = -1;

		function setActivePillar(index) {
			if (index === currentActive) return;
			currentActive = index;

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

		ScrollTrigger.create({
			trigger: pillarsWrap,
			start: 'top top',
			end: '+=180%',
			pin: true,
			pinSpacing: true,
			onEnter: function () {
				setActivePillar(0);
			},
			onUpdate: function (self) {
				var progress = self.progress;
				if (progress < 0.34) {
					setActivePillar(0);
				} else if (progress < 0.68) {
					setActivePillar(1);
				} else {
					setActivePillar(2);
				}
			},
			onLeave: function () {
				setActivePillar(-1);
			},
			onLeaveBack: function () {
				setActivePillar(-1);
			}
		});
	}

	/**
	 * Reproduce videos de pilares también en hover y pausa videos fuera de pantalla.
	 */
	function initSmartVideos() {
		// Pilares: video en hover (desktop)
		var pillars = document.querySelectorAll('.gw-pillar, .g-4913cbe');
		pillars.forEach(function (pillar) {
			var vid = pillar.querySelector('video');
			if (!vid) return;

			vid.muted = true;
			vid.loop = true;
			vid.playsInline = true;
			vid.pause();

			pillar.addEventListener('mouseenter', function () {
				var playPromise = vid.play();
				if (playPromise && typeof playPromise.catch === 'function') {
					playPromise.catch(function () {});
				}
			});

			pillar.addEventListener('mouseleave', function () {
				vid.pause();
			});
		});

		// Pausar videos de escenas cuando no están visibles en pantalla
		if ('IntersectionObserver' in window) {
			var sceneVideos = document.querySelectorAll('.gw-hero-scene video, .g-8364edf video, .gw-ocean-scene video, .g-45e7068 video');
			var videoObserver = new IntersectionObserver(
				function (entries) {
					entries.forEach(function (entry) {
						var v = entry.target;
						if (entry.isIntersecting) {
							var p = v.play();
							if (p && typeof p.catch === 'function') {
								p.catch(function () {});
							}
						} else {
							v.pause();
						}
					});
				},
				{ threshold: 0.1 }
			);

			sceneVideos.forEach(function (v) {
				v.muted = true;
				v.playsInline = true;
				videoObserver.observe(v);
			});
		}
	}
})();
