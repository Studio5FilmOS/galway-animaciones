<?php
/**
 * Plugin Name: Galway Animaciones Inmersivas
 * Description: Motor ligero de animaciones inmersivas (Lenis Smooth Scroll, GSAP ScrollTrigger, acordeón de pilares, menú overlay y entorno submarino) 100% compatible con Elementor Gratuito y Astra.
 * Version: 2.14.4
 * Author: Studio 5 - Jesse Añazco
 * License: GPL-2.0+
 * Text Domain: galway-animaciones
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'GALWAY_ANIM_VERSION', '2.14.4' );
define( 'GALWAY_ANIM_URL', plugin_dir_url( __FILE__ ) );

/**
 * Comprueba si estamos dentro del editor o vista previa de Elementor.
 */
function galway_anim_is_elementor_editor() {
	if ( isset( $_GET['elementor-preview'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return true;
	}

	if ( did_action( 'elementor/loaded' ) && class_exists( '\Elementor\Plugin' ) ) {
		$elementor = \Elementor\Plugin::$instance;
		if ( isset( $elementor->editor ) && $elementor->editor->is_edit_mode() ) {
			return true;
		}
		if ( isset( $elementor->preview ) && $elementor->preview->is_preview_mode() ) {
			return true;
		}
	}

	return false;
}

/**
 * Encola estilos y scripts solo en el frontend público.
 */
function galway_anim_enqueue_assets() {
	if ( is_admin() || galway_anim_is_elementor_editor() ) {
		return;
	}

	// CSS principal del plugin.
	wp_enqueue_style(
		'galway-animations-css',
		GALWAY_ANIM_URL . 'assets/css/galway-animations.css',
		array(),
		GALWAY_ANIM_VERSION
	);

	// Lenis Smooth Scroll.
	wp_enqueue_script(
		'lenis-smooth-scroll',
		'https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js',
		array(),
		'1.1.18',
		true
	);

	// GSAP Core + ScrollTrigger.
	wp_enqueue_script(
		'gsap-core',
		'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js',
		array(),
		'3.12.5',
		true
	);

	wp_enqueue_script(
		'gsap-scrolltrigger',
		'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js',
		array( 'gsap-core' ),
		'3.12.5',
		true
	);

	// Script de animaciones inmersivas de Galway.
	wp_enqueue_script(
		'galway-animations-js',
		GALWAY_ANIM_URL . 'assets/js/galway-animations.js',
		array( 'lenis-smooth-scroll', 'gsap-core', 'gsap-scrolltrigger' ),
		GALWAY_ANIM_VERSION,
		true
	);

	wp_localize_script(
		'galway-animations-js',
		'galwayAnimConfig',
		array(
			'ajaxUrl'         => admin_url( 'admin-ajax.php' ),
			'nonce'           => wp_create_nonce( 'galway_quiz_nonce' ),
			'audioSuperficie' => esc_url( get_option( 'galway_audio_superficie', '' ) ),
			'audioSubmarino'  => esc_url( get_option( 'galway_audio_submarino', '' ) ),
			'audioVolume'     => max( 0, min( 1, intval( get_option( 'galway_audio_volume', 45 ) ) / 100 ) ),
		)
	);
}
add_action( 'wp_enqueue_scripts', 'galway_anim_enqueue_assets', 99 );

/**
 * Agrega clase identificadora al body en el frontend.
 */
function galway_anim_body_class( $classes ) {
	if ( ! is_admin() && ! galway_anim_is_elementor_editor() ) {
		$classes[] = 'galway-anim-enabled';
		$classes[] = 'has-gw-fixed-footer';
	}
	return $classes;
}
add_filter( 'body_class', 'galway_anim_body_class' );

/**
 * Auto-actualizador nativo desde GitHub Releases (Studio5FilmOS/galway-animaciones).
 */
define( 'GALWAY_ANIM_GH_REPO', 'Studio5FilmOS/galway-animaciones' );

function galway_anim_get_latest_release() {
	global $pagenow;
	$cache_key = 'galway_anim_gh_release';
	if ( is_admin() && ( isset( $_GET['force-check'] ) || isset( $_GET['gw-check-update'] ) || 'plugins.php' === $pagenow || 'update-core.php' === $pagenow ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		delete_transient( $cache_key );
	}
	$cached = get_transient( $cache_key );
	if ( false !== $cached ) {
		return is_array( $cached ) ? $cached : null;
	}

	$response = wp_remote_get(
		'https://api.github.com/repos/' . GALWAY_ANIM_GH_REPO . '/releases/latest',
		array(
			'timeout' => 10,
			'headers' => array(
				'Accept'     => 'application/vnd.github.v3+json',
				'User-Agent' => 'WordPress-Galway-Animaciones/' . GALWAY_ANIM_VERSION,
			),
		)
	);

	if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
		set_transient( $cache_key, 'none', 5 * MINUTE_IN_SECONDS );
		return null;
	}

	$body = json_decode( wp_remote_retrieve_body( $response ), true );
	if ( empty( $body['tag_name'] ) ) {
		set_transient( $cache_key, 'none', 5 * MINUTE_IN_SECONDS );
		return null;
	}

	$version = ltrim( $body['tag_name'], 'vV' );
	$zip_url = '';
	if ( ! empty( $body['assets'] ) && is_array( $body['assets'] ) ) {
		foreach ( $body['assets'] as $asset ) {
			if ( ! empty( $asset['browser_download_url'] ) && '.zip' === substr( $asset['name'], -4 ) ) {
				$zip_url = $asset['browser_download_url'];
				break;
			}
		}
	}

	if ( empty( $zip_url ) ) {
		set_transient( $cache_key, 'none', 5 * MINUTE_IN_SECONDS );
		return null;
	}

	$release = array(
		'version' => $version,
		'zip_url' => $zip_url,
		'notes'   => ! empty( $body['body'] ) ? $body['body'] : 'Actualización de Galway Animaciones Inmersivas.',
	);

	set_transient( $cache_key, $release, 5 * MINUTE_IN_SECONDS );
	return $release;
}

function galway_anim_check_update( $transient ) {
	if ( ! is_object( $transient ) ) {
		return $transient;
	}

	$release = galway_anim_get_latest_release();
	if ( $release && version_compare( GALWAY_ANIM_VERSION, $release['version'], '<' ) ) {
		$plugin_slug = plugin_basename( __FILE__ );
		$transient->response[ $plugin_slug ] = (object) array(
			'slug'        => 'galway-animaciones',
			'plugin'      => $plugin_slug,
			'new_version' => $release['version'],
			'url'         => 'https://github.com/' . GALWAY_ANIM_GH_REPO,
			'package'     => $release['zip_url'],
		);
	}

	return $transient;
}
add_filter( 'pre_set_site_transient_update_plugins', 'galway_anim_check_update' );

function galway_anim_handle_manual_check() {
	if ( is_admin() && isset( $_GET['gw-check-update'] ) && current_user_can( 'update_plugins' ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		delete_transient( 'galway_anim_gh_release' );
		delete_site_transient( 'update_plugins' );
		wp_update_plugins();
		wp_safe_redirect( admin_url( 'plugins.php' ) );
		exit;
	}
}
add_action( 'admin_init', 'galway_anim_handle_manual_check' );

function galway_anim_action_links( $links ) {
	$url     = admin_url( 'plugins.php?gw-check-update=1' );
	$links[] = '<a href="' . esc_url( $url ) . '">Buscar actualización</a>';
	return $links;
}
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'galway_anim_action_links' );

function galway_anim_plugin_info( $res, $action, $args ) {
	if ( 'plugin_information' !== $action || empty( $args->slug ) || 'galway-animaciones' !== $args->slug ) {
		return $res;
	}

	$release = galway_anim_get_latest_release();
	if ( ! $release ) {
		return $res;
	}

	return (object) array(
		'name'          => 'Galway Animaciones Inmersivas',
		'slug'          => 'galway-animaciones',
		'version'       => $release['version'],
		'author'        => 'Studio 5 - Jesse Añazco',
		'homepage'      => 'https://github.com/' . GALWAY_ANIM_GH_REPO,
		'download_link' => $release['zip_url'],
		'sections'      => array(
			'description' => 'Motor de animaciones inmersivas para Elementor y Astra.',
			'changelog'   => nl2br( esc_html( $release['notes'] ) ),
		),
	);
}
add_filter( 'plugins_api', 'galway_anim_plugin_info', 10, 3 );

/**
 * Habilita actualización automática en segundo plano para este plugin.
 */
function galway_anim_auto_update( $update, $item ) {
	if ( isset( $item->plugin ) && plugin_basename( __FILE__ ) === $item->plugin ) {
		return true;
	}
	return $update;
}
add_filter( 'auto_update_plugin', 'galway_anim_auto_update', 10, 2 );

/**
 * Shortcode [galway_trip_quiz] - Formulario de 1 paso estilo Galway.
 */
function galway_anim_trip_quiz_shortcode() {
	ob_start();
	?>
	<form class="gw-quiz-form" method="post" action="">
		<div class="gw-quiz-group">
			<p class="gw-quiz-label">WHAT IS YOUR PREFERRED TRAVEL STYLE? <span class="gw-req">*</span></p>
			<div class="gw-quiz-options">
				<label class="gw-check"><input type="checkbox" name="travel_style[]" value="Luxury Experience"><span>Luxury Experience</span></label>
				<label class="gw-check"><input type="checkbox" name="travel_style[]" value="Nature &amp; Wildlife"><span>Nature &amp; Wildlife</span></label>
				<label class="gw-check"><input type="checkbox" name="travel_style[]" value="Academic Group"><span>Academic Group</span></label>
				<label class="gw-check"><input type="checkbox" name="travel_style[]" value="Active &amp; Adventure"><span>Active &amp; Adventure</span></label>
			</div>
		</div>

		<div class="gw-quiz-group">
			<p class="gw-quiz-label">WHAT DO YOU ENJOY MOST WHEN TRAVELLING? <span class="gw-quiz-hint">Please select all that apply</span></p>
			<div class="gw-quiz-options gw-quiz-options-grid">
				<label class="gw-check"><input type="checkbox" name="interests[]" value="Being active"><span>Being active</span></label>
				<label class="gw-check"><input type="checkbox" name="interests[]" value="Expedition cruises"><span>Expedition cruises</span></label>
				<label class="gw-check"><input type="checkbox" name="interests[]" value="Food and wine"><span>Food and wine</span></label>
				<label class="gw-check"><input type="checkbox" name="interests[]" value="Historical sites"><span>Historical sites</span></label>
				<label class="gw-check"><input type="checkbox" name="interests[]" value="Local culture"><span>Local culture</span></label>
				<label class="gw-check"><input type="checkbox" name="interests[]" value="Off the beaten track"><span>Off the beaten track</span></label>
				<label class="gw-check"><input type="checkbox" name="interests[]" value="Scenery"><span>Scenery</span></label>
				<label class="gw-check"><input type="checkbox" name="interests[]" value="Wildlife"><span>Wildlife</span></label>
			</div>
		</div>

		<div class="gw-quiz-footer">
			<input type="email" name="traveler_email" class="gw-quiz-input" placeholder="Your email address *" required>
			<button type="submit" class="gw-quiz-submit">PLAN MY TRIP</button>
		</div>
		<div class="gw-quiz-msg" aria-live="polite"></div>
	</form>
	<?php
	return ob_get_clean();
}
add_shortcode( 'galway_trip_quiz', 'galway_anim_trip_quiz_shortcode' );

/**
 * Permite renderizar [galway_trip_quiz] incluso dentro de widgets de párrafo de Elementor.
 */
function galway_anim_render_quiz_in_widget( $content ) {
	if ( false !== strpos( $content, '[galway_trip_quiz]' ) ) {
		$content = str_replace( '[galway_trip_quiz]', galway_anim_trip_quiz_shortcode(), $content );
	}
	return $content;
}
add_filter( 'elementor/widget/render_content', 'galway_anim_render_quiz_in_widget', 10, 1 );

/**
 * Procesa el envío AJAX del formulario [galway_trip_quiz].
 */
function galway_anim_handle_quiz_submit() {
	check_ajax_referer( 'galway_quiz_nonce', 'nonce' );

	$email     = isset( $_POST['traveler_email'] ) ? sanitize_email( wp_unslash( $_POST['traveler_email'] ) ) : '';
	$styles    = isset( $_POST['travel_style'] ) ? array_map( 'sanitize_text_field', (array) wp_unslash( $_POST['travel_style'] ) ) : array();
	$interests = isset( $_POST['interests'] ) ? array_map( 'sanitize_text_field', (array) wp_unslash( $_POST['interests'] ) ) : array();

	if ( empty( $email ) || ! is_email( $email ) ) {
		wp_send_json_error( array( 'message' => 'Please enter a valid email address.' ) );
	}

	if ( empty( $styles ) ) {
		wp_send_json_error( array( 'message' => 'Please select at least one travel style.' ) );
	}

	$to      = get_option( 'admin_email' );
	$subject = 'New Trip Inquiry - Galapagos Your Own Way';
	$body    = "Traveler Email: {$email}\n\n"
		. 'Preferred Travel Style: ' . implode( ', ', $styles ) . "\n"
		. 'Interests: ' . ( ! empty( $interests ) ? implode( ', ', $interests ) : 'None selected' ) . "\n";

	$sent = wp_mail( $to, $subject, $body, array( 'Reply-To: ' . $email ) );

	if ( $sent ) {
		wp_send_json_success( array( 'message' => 'Thank you! Our Galápagos specialists will contact you soon.' ) );
	} else {
		wp_send_json_success( array( 'message' => 'Request received! Thank you for planning your trip with us.' ) );
	}
}
add_action( 'wp_ajax_galway_quiz_submit', 'galway_anim_handle_quiz_submit' );
add_action( 'wp_ajax_nopriv_galway_quiz_submit', 'galway_anim_handle_quiz_submit' );

/**
 * Panel de ajustes en WordPress: Ajustes > Galway Audios (AUDIOS: Superficie / Submarino).
 */
function galway_anim_register_audio_settings() {
	register_setting(
		'galway_anim_audios_group',
		'galway_audio_superficie',
		array(
			'type'              => 'string',
			'sanitize_callback' => 'esc_url_raw',
			'default'           => '',
		)
	);

	register_setting(
		'galway_anim_audios_group',
		'galway_audio_submarino',
		array(
			'type'              => 'string',
			'sanitize_callback' => 'esc_url_raw',
			'default'           => '',
		)
	);

	register_setting(
		'galway_anim_audios_group',
		'galway_audio_volume',
		array(
			'type'              => 'integer',
			'sanitize_callback' => function ( $val ) {
				return max( 0, min( 100, intval( $val ) ) );
			},
			'default'           => 45,
		)
	);
}
add_action( 'admin_init', 'galway_anim_register_audio_settings' );

function galway_anim_add_audio_menu() {
	add_options_page(
		'AUDIOS',
		'Galway Audios',
		'manage_options',
		'galway-audios',
		'galway_anim_render_audio_page'
	);
}
add_action( 'admin_menu', 'galway_anim_add_audio_menu' );

function galway_anim_admin_enqueue_media( $hook ) {
	if ( 'settings_page_galway-audios' === $hook ) {
		wp_enqueue_media();
	}
}
add_action( 'admin_enqueue_scripts', 'galway_anim_admin_enqueue_media' );

function galway_anim_render_audio_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$superficie = get_option( 'galway_audio_superficie', '' );
	$submarino  = get_option( 'galway_audio_submarino', '' );
	$volume     = intval( get_option( 'galway_audio_volume', 45 ) );
	?>
	<div class="wrap">
		<h1>AUDIOS</h1>
		<form method="post" action="options.php">
			<?php settings_fields( 'galway_anim_audios_group' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="galway_audio_superficie">Superficie</label></th>
					<td>
						<input type="url" id="galway_audio_superficie" name="galway_audio_superficie" value="<?php echo esc_attr( $superficie ); ?>" class="regular-text">
						<button type="button" class="button gw-pick-audio" data-target="galway_audio_superficie">Elegir MP3</button>
						<button type="button" class="button gw-clear-audio" data-target="galway_audio_superficie">Quitar</button>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="galway_audio_submarino">Submarino</label></th>
					<td>
						<input type="url" id="galway_audio_submarino" name="galway_audio_submarino" value="<?php echo esc_attr( $submarino ); ?>" class="regular-text">
						<button type="button" class="button gw-pick-audio" data-target="galway_audio_submarino">Elegir MP3</button>
						<button type="button" class="button gw-clear-audio" data-target="galway_audio_submarino">Quitar</button>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="galway_audio_volume">Volumen</label></th>
					<td>
						<input type="range" id="galway_audio_volume" name="galway_audio_volume" min="0" max="100" value="<?php echo esc_attr( $volume ); ?>" oninput="document.getElementById('gw_vol_label').textContent = this.value + '%';">
						<span id="gw_vol_label"><?php echo esc_html( $volume ); ?>%</span>
					</td>
				</tr>
			</table>
			<?php submit_button( 'Guardar' ); ?>
		</form>
	</div>
	<script>
	jQuery(function($){
		$('.gw-pick-audio').on('click', function(e){
			e.preventDefault();
			var targetId = $(this).data('target');
			var frame = wp.media({ title: 'Elegir audio MP3', library: { type: 'audio' }, multiple: false });
			frame.on('select', function(){
				var att = frame.state().get('selection').first().toJSON();
				$('#' + targetId).val(att.url);
			});
			frame.open();
		});
		$('.gw-clear-audio').on('click', function(e){
			e.preventDefault();
			$('#' + $(this).data('target')).val('');
		});
	});
	</script>
	<?php
}

/**
 * Renderiza Header, Menú Sánduche Overlay (con HOME + página activa en bold) y Barra Footer Glassmorphism unificados en todo el frontend.
 */
function galway_anim_render_global_chrome() {
	if ( is_admin() || galway_anim_is_elementor_editor() ) {
		return;
	}

	$req_path = '';
	if ( isset( $_SERVER['REQUEST_URI'] ) ) {
		$parsed   = wp_parse_url( sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ), PHP_URL_PATH );
		$req_path = strtolower( trim( (string) $parsed, '/' ) );
	}

	$active_key = '';
	if ( false !== strpos( $req_path, 'journeys' ) ) {
		$active_key = 'journeys';
	} elseif ( false !== strpos( $req_path, 'about-us' ) ) {
		$active_key = 'about-us';
	} elseif ( false !== strpos( $req_path, 'islands' ) ) {
		$active_key = 'the-islands';
	} elseif ( false !== strpos( $req_path, 'community' ) ) {
		$active_key = 'community';
	} elseif ( false !== strpos( $req_path, 'mainland' ) ) {
		$active_key = 'mainland-ecuador';
	} elseif ( is_front_page() || is_home() || '' === $req_path || 'home-2' === $req_path || 'home' === $req_path ) {
		$active_key = 'home';
	}

	$home_url     = 'https://www.galway.com.ec/home-2/';
	$journeys_url = 'https://www.galway.com.ec/journeys/';
	$about_url    = 'https://www.galway.com.ec/about-us/';
	$logo_url     = 'https://www.galway.com.ec/wp-content/uploads/2026/11/gw-logo-blanco.png';

	$nav_items = array(
		array( 'key' => 'home', 'label_en' => 'HOME', 'label_es' => 'INICIO', 'url' => $home_url, 'class' => '' ),
		array( 'key' => 'journeys', 'label_en' => 'JOURNEYS', 'label_es' => 'VIAJES', 'url' => $journeys_url, 'class' => 'gw-journeys-trigger' ),
		array( 'key' => 'the-islands', 'label_en' => 'THE ISLANDS', 'label_es' => 'LAS ISLAS', 'url' => '#', 'class' => '' ),
		array( 'key' => 'community', 'label_en' => 'COMMUNITY', 'label_es' => 'COMUNIDAD', 'url' => '#', 'class' => '' ),
		array( 'key' => 'mainland-ecuador', 'label_en' => 'MAINLAND ECUADOR', 'label_es' => 'ECUADOR CONTINENTAL', 'url' => '#', 'class' => '' ),
		array( 'key' => 'about-us', 'label_en' => 'ABOUT US', 'label_es' => 'NOSOTROS', 'url' => $about_url, 'class' => '' ),
	);
	?>
	<header class="gw-global-header" role="banner">
		<a class="gw-gh-brand" href="<?php echo esc_url( $home_url ); ?>">
			<img src="<?php echo esc_url( $logo_url ); ?>" alt="Galapagos Your Own Way" class="gw-gh-logo">
			<span class="gw-gh-since notranslate" translate="no">SINCE 2006</span>
		</a>
		<div class="gw-gh-right">
			<div class="gw-gh-lang notranslate" translate="no" role="group" aria-label="Idioma">
				<button type="button" class="gw-lang-btn is-active" data-gw-lang="en">EN</button>
				<span class="gw-lang-sep">|</span>
				<button type="button" class="gw-lang-btn" data-gw-lang="es">ES</button>
			</div>
			<button type="button" class="gw-gh-menu-btn gw-menu-toggle" aria-label="Abrir menú">
				<svg width="24" height="18" viewBox="0 0 24 18" fill="none" aria-hidden="true">
					<line x1="0" y1="2" x2="24" y2="2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
					<line x1="0" y1="9" x2="24" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
					<line x1="0" y1="16" x2="24" y2="16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
				</svg>
			</button>
		</div>
	</header>

	<div class="gw-global-menu notranslate" translate="no" aria-hidden="true">
		<div class="gw-gm-cards">
			<a class="gw-gm-card" href="<?php echo esc_url( $journeys_url ); ?>">
				<img src="https://www.galway.com.ec/wp-content/uploads/2026/11/card-on-board.webp" alt="On-Board Cruises">
				<span class="gw-gm-card-title notranslate" translate="no" data-label-en="ON-BOARD" data-label-es="A BORDO">ON-BOARD</span>
			</a>
			<a class="gw-gm-card" href="<?php echo esc_url( $journeys_url ); ?>">
				<img src="https://www.galway.com.ec/wp-content/uploads/2026/11/card-island-hopping.webp" alt="Island Hopping">
				<span class="gw-gm-card-title notranslate" translate="no" data-label-en="ISLAND<br>HOPPING" data-label-es="ISLAND<br>HOPPING">ISLAND<br>HOPPING</span>
			</a>
			<a class="gw-gm-card" href="<?php echo esc_url( $journeys_url ); ?>">
				<img src="https://www.galway.com.ec/wp-content/uploads/2026/11/card-diving.webp" alt="Diving">
				<span class="gw-gm-card-title notranslate" translate="no" data-label-en="DIVING" data-label-es="BUCEO">DIVING</span>
			</a>
			<a class="gw-gm-card" href="<?php echo esc_url( $journeys_url ); ?>">
				<img src="https://www.galway.com.ec/wp-content/uploads/2026/11/card-education.webp" alt="Education">
				<span class="gw-gm-card-title notranslate" translate="no" data-label-en="EDUCATION" data-label-es="EDUCACIÓN">EDUCATION</span>
			</a>
		</div>
		<nav class="gw-gm-nav" aria-label="Menú principal">
			<button type="button" class="gw-gm-close gw-menu-close" aria-label="Cerrar menú">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
					<line x1="3" y1="3" x2="17" y2="17" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
					<line x1="17" y1="3" x2="3" y2="17" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
				</svg>
			</button>
			<?php foreach ( $nav_items as $item ) :
				$classes = array( 'gw-gm-link', 'notranslate' );
				if ( ! empty( $item['class'] ) ) {
					$classes[] = $item['class'];
				}
				if ( $active_key === $item['key'] ) {
					$classes[] = 'is-active';
				}
				?>
				<a class="<?php echo esc_attr( implode( ' ', $classes ) ); ?>" translate="no" href="<?php echo esc_url( $item['url'] ); ?>" data-gw-nav="<?php echo esc_attr( $item['key'] ); ?>" data-label-en="<?php echo esc_attr( $item['label_en'] ); ?>" data-label-es="<?php echo esc_attr( $item['label_es'] ); ?>"><?php echo esc_html( $item['label_en'] ); ?></a>
			<?php endforeach; ?>
		</nav>
	</div>

	<div class="gw-global-footer-bar" role="contentinfo">
		<a class="gw-gfb-left" href="<?php echo esc_url( $home_url ); ?>">
			<img src="<?php echo esc_url( $logo_url ); ?>" alt="GW" class="gw-gfb-logo">
			<span class="gw-gfb-slogan">GALÁPAGOS, YOUR OWN WAY.</span>
		</a>
		<span class="gw-gfb-since notranslate" translate="no">SINCE 2006</span>
	</div>
	<div id="gw_google_translate_el" class="gw-gt-hidden" aria-hidden="true"></div>
	<?php
}
add_action( 'wp_footer', 'galway_anim_render_global_chrome', 5 );
