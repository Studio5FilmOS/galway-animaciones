<?php
/**
 * Plugin Name: Galway Animaciones Inmersivas
 * Description: Motor ligero de animaciones inmersivas (Lenis Smooth Scroll, GSAP ScrollTrigger, acordeón de pilares, menú overlay y entorno submarino) 100% compatible con Elementor Gratuito y Astra.
 * Version: 2.10.0
 * Author: Studio 5 - Jesse Añazco
 * License: GPL-2.0+
 * Text Domain: galway-animaciones
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'GALWAY_ANIM_VERSION', '2.10.0' );
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
