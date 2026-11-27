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

		// 1c. Selector de idioma EN | ES automático con Google Translate invisible
		initLanguageSwitcher();

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
	 * Sincroniza el Header global unificado con efecto glassmorphism al hacer scroll.
	 */
	function initFixedHeader(lenis) {
		var header = document.querySelector('.gw-global-header');
		if (!header) {
			return;
		}

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
	 * Selector de idioma EN | ES automático con Google Translate invisible (sin barra superior).
	 */
	function initLanguageSwitcher() {
		var switcher = document.querySelector('.gw-gh-lang');
		if (!switcher) {
			return;
		}

		// Proteger textos de marca y nombres propios contra traducción automática
		var noTransSelectors = '[data-id="51333e66"], [data-id="94ff9fd"], [data-id="40c85c2"], [data-id="78e51505"], [data-id="fd80fb1"], [data-id="3353134a"], [data-id="324d5b5a"], [data-id="54c519cc"], [data-id="6b8178d1"]';
		document.querySelectorAll(noTransSelectors).forEach(function (el) {
			el.classList.add('notranslate');
			el.setAttribute('translate', 'no');
		});

		var buttons = switcher.querySelectorAll('.gw-lang-btn');
		var gtLoaded = false;

		var navDict = {
			home: { en: 'HOME', es: 'INICIO' },
			journeys: { en: 'JOURNEYS', es: 'VIAJES' },
			'the-islands': { en: 'THE ISLANDS', es: 'LAS ISLAS' },
			community: { en: 'COMMUNITY', es: 'COMUNIDAD' },
			'mainland-ecuador': { en: 'MAINLAND ECUADOR', es: 'ECUADOR CONTINENTAL' },
			'about-us': { en: 'ABOUT US', es: 'NOSOTROS' }
		};
		var cardDict = [
			{ en: 'ON-BOARD', es: 'A BORDO' },
			{ en: 'ISLAND<br>HOPPING', es: 'ISLAND<br>HOPPING' },
			{ en: 'DIVING', es: 'BUCEO' },
			{ en: 'EDUCATION', es: 'EDUCACIÓN' }
		];

		function protectMenuDom() {
			var menuEl = document.querySelector('.gw-global-menu');
			if (menuEl) {
				menuEl.classList.add('notranslate');
				menuEl.setAttribute('translate', 'no');
				menuEl.querySelectorAll('.gw-gm-link, .gw-gm-card-title').forEach(function (el) {
					el.classList.add('notranslate');
					el.setAttribute('translate', 'no');
				});
			}
		}

		function applyMenuLabels(lang) {
			protectMenuDom();
			var keyLang = lang === 'es' ? 'es' : 'en';

			document.querySelectorAll('.gw-global-menu .gw-gm-link').forEach(function (el) {
				var key = el.getAttribute('data-gw-nav') || '';
				var attrVal = el.getAttribute('data-label-' + keyLang);
				var dictVal = navDict[key] ? navDict[key][keyLang] : '';
				var nextText = dictVal || attrVal;
				if (nextText) {
					el.textContent = nextText;
				}
			});

			document.querySelectorAll('.gw-global-menu .gw-gm-card-title').forEach(function (el, idx) {
				var attrVal = el.getAttribute('data-label-' + keyLang);
				var dictVal = cardDict[idx] ? cardDict[idx][keyLang] : '';
				var nextHtml = dictVal || attrVal;
				if (nextHtml) {
					el.innerHTML = nextHtml;
				}
			});
		}

		protectMenuDom();

		function getCurrentLang() {
			var m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
			if (m && m[1]) {
				var val = decodeURIComponent(m[1]);
				if (/\/es$/i.test(val)) {
					return 'es';
				}
			}
			var htmlEl = document.documentElement;
			if (htmlEl && (htmlEl.classList.contains('translated-ltr') || /^es\b/i.test(htmlEl.lang || ''))) {
				return 'es';
			}
			return 'en';
		}

		function setGoogTransCookie(lang) {
			var host = window.location.hostname || '';
			var baseDomain = host.replace(/^www\./i, '');
			if (lang === 'es') {
				document.cookie = 'googtrans=/en/es; path=/; SameSite=Lax';
				if (baseDomain && baseDomain.indexOf('.') !== -1) {
					document.cookie = 'googtrans=/en/es; path=/; domain=.' + baseDomain + '; SameSite=Lax';
				}
			} else {
				var exp = 'max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
				document.cookie = 'googtrans=; path=/; ' + exp;
				document.cookie = 'googtrans=/en/en; path=/; ' + exp;
				if (baseDomain && baseDomain.indexOf('.') !== -1) {
					document.cookie = 'googtrans=; path=/; domain=.' + baseDomain + '; ' + exp;
					document.cookie = 'googtrans=/en/en; path=/; domain=.' + baseDomain + '; ' + exp;
				}
			}
		}

		function syncButtons(lang) {
			buttons.forEach(function (btn) {
				btn.classList.toggle('is-active', btn.getAttribute('data-gw-lang') === lang);
			});
			applyMenuLabels(lang);
		}

		function waitForCombo(attemptsLeft, cb) {
			var combo = document.querySelector('select.goog-te-combo');
			if (combo) {
				cb(combo);
				return;
			}
			if (attemptsLeft <= 0) {
				cb(null);
				return;
			}
			setTimeout(function () {
				waitForCombo(attemptsLeft - 1, cb);
			}, 150);
		}

		function loadGoogleTranslate(onReady) {
			if (gtLoaded && window.google && window.google.translate) {
				waitForCombo(20, onReady || function () {});
				return;
			}

			window.gwGoogleTranslateInit = function () {
				if (window.google && window.google.translate && window.google.translate.TranslateElement) {
					new window.google.translate.TranslateElement(
						{
							pageLanguage: 'en',
							includedLanguages: 'en,es',
							autoDisplay: false
						},
						'gw_google_translate_el'
					);
				}
				if (onReady) {
					waitForCombo(20, onReady);
				}
			};

			if (!gtLoaded) {
				gtLoaded = true;
				var s = document.createElement('script');
				s.src = 'https://translate.google.com/translate_a/element.js?cb=gwGoogleTranslateInit';
				s.async = true;
				document.head.appendChild(s);
			}
		}

		if ('MutationObserver' in window) {
			var htmlObserver = new MutationObserver(function () {
				applyMenuLabels(getCurrentLang());
			});
			htmlObserver.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['class', 'lang']
			});
		}

		document.querySelectorAll('.gw-menu-toggle, .g-22674b6').forEach(function (btn) {
			btn.addEventListener('click', function () {
				applyMenuLabels(getCurrentLang());
			});
		});

		var initialLang = getCurrentLang();
		syncButtons(initialLang);
		if (initialLang === 'es') {
			loadGoogleTranslate(function () {
				applyMenuLabels('es');
			});
		}

		buttons.forEach(function (btn) {
			btn.addEventListener('click', function () {
				var targetLang = btn.getAttribute('data-gw-lang');
				if (!targetLang) return;

				var current = getCurrentLang();
				if (targetLang === current) return;

				if (targetLang === 'es') {
					setGoogTransCookie('es');
					syncButtons('es');
					loadGoogleTranslate(function (combo) {
						if (combo) {
							combo.value = 'es';
							combo.dispatchEvent(new Event('change'));
							setTimeout(function () {
								applyMenuLabels('es');
							}, 400);
						} else {
							window.location.reload();
						}
					});
				} else {
					setGoogTransCookie('en');
					syncButtons('en');
					window.location.reload();
				}
			});
		});
	}

	/**
	 * Controla el Menú Sánduche Overlay unificado y marca en bold la página activa.
	 */
	function initMenuOverlay(lenis) {
		var overlay = document.querySelector('.gw-global-menu') || document.querySelector('.gw-menu-overlay, .g-e1203d2');
		var toggles = document.querySelectorAll('.gw-menu-toggle, .g-22674b6');
		var closeBtns = document.querySelectorAll('.gw-menu-close, .g-9e390e4');
		var journeysTrigger = overlay ? overlay.querySelector('.gw-journeys-trigger, .g-be34468') : null;

		if (!overlay || !toggles.length) {
			return;
		}

		// Respaldo en cliente para marcar siempre en bold la página actual (compatible con caché)
		var path = (window.location.pathname || '/').toLowerCase();
		var activeKey = '';
		if (path.indexOf('journeys') !== -1) {
			activeKey = 'journeys';
		} else if (path.indexOf('about-us') !== -1) {
			activeKey = 'about-us';
		} else if (path.indexOf('islands') !== -1) {
			activeKey = 'the-islands';
		} else if (path.indexOf('community') !== -1) {
			activeKey = 'community';
		} else if (path.indexOf('mainland') !== -1) {
			activeKey = 'mainland-ecuador';
		} else if (path === '/' || path === '/home-2/' || path === '/home-2' || path === '/home/' || path === '/home') {
			activeKey = 'home';
		}

		var navLinks = overlay.querySelectorAll('.gw-gm-link');
		navLinks.forEach(function (link) {
			var navKey = link.getAttribute('data-gw-nav') || '';
			link.classList.toggle('is-active', !!activeKey && navKey === activeKey);
			if (link.getAttribute('href') === '#') {
				link.addEventListener('click', function (e) {
					e.preventDefault();
				});
			}
		});

		function openMenu(e) {
			if (e) e.preventDefault();
			overlay.classList.add('is-open');
			overlay.classList.add('journeys-active');
			overlay.setAttribute('aria-hidden', 'false');
			document.body.classList.add('gw-menu-open');
			if (lenis) lenis.stop();
		}

		function closeMenu(e) {
			if (e) e.preventDefault();
			overlay.classList.remove('is-open');
			overlay.classList.remove('journeys-active');
			overlay.setAttribute('aria-hidden', 'true');
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

		var ratingTween = null;
		var countTween = null;

		function getJourneySceneParts(scene) {
			return {
				bands: scene ? scene.querySelectorAll('.gw-journey-band, .g-94d1e9f') : [],
				photos: scene ? scene.querySelectorAll('.gw-journey-photo, .g-f3be2a4') : [],
				leftCols: scene ? scene.querySelectorAll('.gw-journey-content > :first-child, .g-04a6590 > :first-child') : [],
				rightItems: scene ? scene.querySelectorAll('.gw-journey-content > :last-child > *, .g-04a6590 > :last-child > *') : []
			};
		}

		function resetSceneReveal(scene) {
			if (!scene) return;
			var j = getJourneySceneParts(scene);
			if (j.bands.length) {
				gsap.killTweensOf(j.leftCols);
				gsap.killTweensOf(j.rightItems);
				if (j.leftCols.length) gsap.set(j.leftCols, { x: -24, opacity: 0 });
				if (j.rightItems.length) gsap.set(j.rightItems, { x: 24, opacity: 0 });
				return;
			}

			var sceneId = scene.getAttribute('data-id');
			if (sceneId === '29d2969a' || scene.querySelector('[data-id="6d8a8986"]')) {
				var vIcon = document.querySelector('[data-id="322de734"]');
				if (vIcon) vIcon.classList.remove('gw-verified-pulse');
				return;
			}

			var genTargets = scene.querySelectorAll('[data-id="1b06af4d"] > *, [data-id="244f8fc0"] > *, [data-id="46c917e3"] > *, [data-id="37923d7e"] > *, [data-id="16d5aeb9"], [data-id="4b57cfd2"], [data-id="16f6b2f9"], [data-id="1fcf7a66"], [data-id="12a8952f"] > *');
			if (!genTargets.length && (scene.classList.contains('gw-footer-curtain') || scene.classList.contains('gw-footer-scene') || scene.classList.contains('g-1a0a9f6'))) {
				genTargets = scene.firstElementChild ? scene.firstElementChild.children : [];
			}
			if (genTargets && genTargets.length) {
				gsap.killTweensOf(genTargets);
				gsap.set(genTargets, { y: 18, opacity: 0 });
			}
		}

		function playSceneReveal(scene) {
			if (!scene) return;
			var j = getJourneySceneParts(scene);
			if (j.bands.length) {
				gsap.killTweensOf(j.photos);
				gsap.killTweensOf(j.leftCols);
				gsap.killTweensOf(j.rightItems);

				if (j.photos.length) {
					gsap.fromTo(
						j.photos,
						{ scale: 1.08 },
						{ scale: 1, duration: 1.15, stagger: 0.1, ease: 'power2.out', overwrite: 'auto' }
					);
				}
				if (j.leftCols.length) {
					gsap.fromTo(
						j.leftCols,
						{ x: -42, opacity: 0 },
						{ x: 0, opacity: 1, duration: 0.72, stagger: 0.1, ease: 'power3.out', overwrite: 'auto' }
					);
				}
				if (j.rightItems.length) {
					gsap.fromTo(
						j.rightItems,
						{ x: 38, opacity: 0 },
						{ x: 0, opacity: 1, duration: 0.68, stagger: 0.08, delay: 0.12, ease: 'power3.out', overwrite: 'auto' }
					);
				}
				return;
			}

			var sceneId = scene.getAttribute('data-id');
			if (sceneId === '29d2969a' || scene.querySelector('[data-id="6d8a8986"]')) {
				triggerReviewsAnimation();
				return;
			}

			if (sceneId === '37582863') {
				var homeHeroEls = scene.querySelectorAll('[data-id="aa45c58"], [data-id="66928e3"], [data-id="6e6c0cd3"]');
				if (homeHeroEls.length) {
					gsap.killTweensOf(homeHeroEls);
					gsap.fromTo(
						homeHeroEls,
						{ y: 18, opacity: 0 },
						{ y: 0, opacity: 1, duration: 0.65, stagger: 0.08, ease: 'power3.out', overwrite: 'auto' }
					);
				}
				return;
			}

			if (sceneId === '893cc79') {
				var jHeroPhotos = scene.querySelectorAll('.gw-journey-photo, .g-f3be2a4');
				var jHeroItems = scene.querySelectorAll('[data-id="46c917e3"] > *, [data-id="37923d7e"] > *');
				if (jHeroPhotos.length) {
					gsap.fromTo(jHeroPhotos, { scale: 1.06 }, { scale: 1, duration: 1.4, ease: 'power2.out', overwrite: 'auto' });
				}
				if (jHeroItems.length) {
					gsap.killTweensOf(jHeroItems);
					gsap.fromTo(jHeroItems, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.68, stagger: 0.09, ease: 'power3.out', overwrite: 'auto' });
				}
				return;
			}

			var items = scene.querySelectorAll('[data-id="1b06af4d"] > *, [data-id="244f8fc0"] > *, [data-id="16d5aeb9"], [data-id="4b57cfd2"], [data-id="16f6b2f9"], [data-id="1fcf7a66"], [data-id="12a8952f"] > *');
			if (!items.length && (scene.classList.contains('gw-footer-curtain') || scene.classList.contains('gw-footer-scene') || scene.classList.contains('g-1a0a9f6'))) {
				items = scene.firstElementChild ? scene.firstElementChild.children : [];
			}
			if (items && items.length) {
				gsap.killTweensOf(items);
				gsap.fromTo(
					items,
					{ y: 24, opacity: 0 },
					{ y: 0, opacity: 1, duration: 0.68, stagger: 0.1, ease: 'power3.out', overwrite: 'auto' }
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
				playSceneReveal(allScenes[0]);
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
				var lastSingleIdx = 0;

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
							var activeSingle = self.progress < 0.48 ? 0 : 1;
							if (activeSingle !== lastSingleIdx) {
								lastSingleIdx = activeSingle;
								playSceneReveal(state.scenes[activeSingle]);
							}
							if (state.setDotCallback) {
								state.setDotCallback(activeSingle);
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

		function triggerReviewsAnimation() {
			var ratingEl = document.querySelector('[data-id="6d8a8986"]');
			var ratingTarget = ratingEl ? (ratingEl.querySelector('p') || ratingEl) : null;
			if (ratingTarget) {
				if (ratingTween) ratingTween.kill();
				var ratingCounter = { val: 0 };
				ratingTween = gsap.to(ratingCounter, {
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
				if (countTween) countTween.kill();
				var countCounter = { val: 0 };
				countTween = gsap.to(countCounter, {
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
				gsap.killTweensOf(stars);
				gsap.fromTo(
					stars,
					{ scale: 0, opacity: 0, rotation: -18 },
					{
						scale: 1,
						opacity: 1,
						rotation: 0,
						duration: 0.45,
						stagger: 0.08,
						ease: 'back.out(2.2)',
						overwrite: 'auto'
					}
				);
			}

			var verifiedIcon = document.querySelector('[data-id="322de734"]');
			if (verifiedIcon) {
				gsap.killTweensOf(verifiedIcon);
				verifiedIcon.classList.remove('gw-verified-pulse');
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
						overwrite: 'auto',
						onComplete: function () {
							verifiedIcon.classList.add('gw-verified-pulse');
						}
					}
				);
			}

			var reviewCards = document.querySelectorAll('[data-id="5050a2d8"], [data-id="127ea8ca"], [data-id="6100e690"]');
			if (reviewCards.length) {
				gsap.killTweensOf(reviewCards);
				gsap.fromTo(
					reviewCards,
					{ y: 28, opacity: 0 },
					{
						y: 0,
						opacity: 1,
						duration: 0.65,
						stagger: 0.12,
						delay: 0.2,
						ease: 'power3.out',
						overwrite: 'auto'
					}
				);
			}
		}

		// Móvil / Tablet: flujo vertical limpio sin pin (con animaciones repetibles al subir y bajar)
		if (window.innerWidth < 1025) {
			if (pillarsWrap) {
				pillars.forEach(function (pillar, idx) {
					pillar.style.cursor = 'pointer';
					pillar.addEventListener('click', function () {
						setActivePillar(currentPillar === idx ? -1 : idx);
					});
				});

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

			allScenes.forEach(function (scene) {
				if (pillarsWrap && scene === pillarsWrap) return;
				var isJourneyOrRevealed = !!(
					scene.querySelector('.gw-journey-band, .g-94d1e9f') ||
					scene.querySelector('[data-id="6d8a8986"]') ||
					scene.getAttribute('data-id') === '7ccbb6a0' ||
					scene.getAttribute('data-id') === '1e464eb1'
				);
				if (isJourneyOrRevealed) {
					ScrollTrigger.create({
						trigger: scene,
						start: 'top 80%',
						end: 'bottom 18%',
						onEnter: function () { playSceneReveal(scene); },
						onEnterBack: function () { playSceneReveal(scene); },
						onLeave: function () { resetSceneReveal(scene); },
						onLeaveBack: function () { resetSceneReveal(scene); }
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
				enterThresholds.push((seg.start + 0.18) / totalUnits);
			});
			state.desktopOffsets = genOffsets;

			var lastGenIdx = 0;
			playSceneReveal(curtains[0]);

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
							}
						}

						if (activeIdx !== lastGenIdx) {
							lastGenIdx = activeIdx;
							playSceneReveal(curtains[activeIdx]);
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

		// Caso B: Escenario Maestro Home (5 cortinas: Hero, Pilares por hover, Iguana, Reviews, Footer)
		state.desktopOffsets = [0, 0.28, 0.58, 0.83, 1.0];
		var lastHomeIdx = 0;

		if (pillarsWrap && pillars.length) {
			pillars.forEach(function (pillar, idx) {
				pillar.style.cursor = 'pointer';
				pillar.addEventListener('mouseenter', function () {
					setActivePillar(idx);
				});
			});
			pillarsWrap.addEventListener('mouseleave', function () {
				setActivePillar(-1);
			});
		}

		var heroScene = allScenes[0];
		var heroVideo = heroScene ? heroScene.querySelector('video, .elementor-background-video-container') : null;
		var heroVideoEl = heroScene ? heroScene.querySelector('video') : null;
		if (heroScene) {
			playSceneReveal(heroScene);
		}

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
				end: '+=520%',
				pin: true,
				pinSpacing: true,
				scrub: 0.95,
				anticipatePin: 1,
				onUpdate: function (self) {
					var p = self.progress;

					// Solo pausar los videos de Pilares si salimos de su cortina (en la cortina los controla el hover)
					if (pillars.length && (p < 0.08 || p > 0.54)) {
						setActivePillar(-1);
					}

					// Pausar video del Hero fuera de vista
					if (heroVideoEl) {
						heroVideoEl.muted = true;
						heroVideoEl.playsInline = true;
						if (p < 0.24) {
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
						if (p >= 0.34 && p < 0.80) {
							if (iguanaVideoEl.paused) {
								var ip = iguanaVideoEl.play();
								if (ip && typeof ip.catch === 'function') ip.catch(function () {});
							}
						} else if (!iguanaVideoEl.paused) {
							iguanaVideoEl.pause();
						}
					}

					var homeActiveIdx = 0;
					if (p < 0.14) homeActiveIdx = 0;
					else if (p < 0.44) homeActiveIdx = 1;
					else if (p < 0.71) homeActiveIdx = 2;
					else if (p < 0.92) homeActiveIdx = 3;
					else homeActiveIdx = 4;

					if (homeActiveIdx !== lastHomeIdx) {
						lastHomeIdx = homeActiveIdx;
						if (homeActiveIdx !== 1 && curtains[homeActiveIdx]) {
							playSceneReveal(curtains[homeActiveIdx]);
						}
					}

					// Actualizar indicador lateral de escenas
					if (state.setDotCallback) {
						state.setDotCallback(homeActiveIdx);
					}
				}
			}
		});

		state.masterTrigger = tl.scrollTrigger;

		// 0.00 -> 0.06: Pausa inicial en Hero (protege boton PLAN YOUR TRIP y WhatsApp al cargar)
		tl.to({}, { duration: 0.06 }, 0);

		// 0.06 -> 0.22: Escena 2 (Pilares) se monta encima del Hero
		if (allScenes[1]) {
			tl.to(allScenes[1], { yPercent: 0, ease: 'none', duration: 0.16 }, 0.06);
		}
		if (heroVideo) {
			tl.to(heroVideo, { scale: 1.06, ease: 'none', duration: 0.16 }, 0.06);
		}

		// 0.22 -> 0.36: Pausa cómoda en Pilares para interactuar con el mouse sobre las 3 columnas
		tl.to({}, { duration: 0.14 }, 0.22);

		// 0.36 -> 0.52: Escena 3 (Iguana Manifesto) se monta encima de Pilares con parallax suave
		if (allScenes[2]) {
			tl.to(allScenes[2], { yPercent: 0, ease: 'none', duration: 0.16 }, 0.36);
		}
		if (iguanaBg) {
			tl.to(iguanaBg, { yPercent: 0, scale: 1, ease: 'none', duration: 0.16 }, 0.36);
		}

		// 0.52 -> 0.64: Pausa en Iguana Manifesto
		tl.to({}, { duration: 0.12 }, 0.52);

		// 0.64 -> 0.78: Escena 4 (Traveler Experiences) se monta encima de Iguana
		if (allScenes[3]) {
			tl.to(allScenes[3], { yPercent: 0, ease: 'none', duration: 0.14 }, 0.64);
		}

		// 0.78 -> 0.88: Pausa limpia para leer Traveler Experiences
		tl.to({}, { duration: 0.10 }, 0.78);

		// 0.88 -> 1.00: Escena 5 (Footer) se monta encima de Traveler Experiences
		if (footerEl) {
			tl.to(footerEl, { yPercent: 0, ease: 'none', duration: 0.12 }, 0.88);
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
