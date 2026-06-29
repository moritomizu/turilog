<?php
/**
 * Plugin Name: TSURILOGUE Media SEO Canonical
 * Description: Sets canonical and OGP URLs for the WordPress media origin to the public /media URLs on tsurilogue.com.
 * Version: 0.1.0
 * Author: TSURILOGUE
 */

if (!defined('ABSPATH')) {
    exit;
}

const TRLG_MEDIA_PUBLIC_BASE_URL = 'https://tsurilogue.com/media';

function trlg_media_public_url_from_request(): string
{
    $requestUri = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '/';
    $path = parse_url($requestUri, PHP_URL_PATH);

    if (!is_string($path) || $path === '') {
        $path = '/';
    }

    // The WordPress origin receives paths without the /media prefix because Vercel rewrites
    // /media/:path* to https://tsurilogue.tapiyota.com/:path*.
    $path = preg_replace('#^/media/?#', '/', $path);
    $path = '/' . ltrim((string) $path, '/');

    if ($path === '/' || $path === '//') {
        return TRLG_MEDIA_PUBLIC_BASE_URL . '/';
    }

    return TRLG_MEDIA_PUBLIC_BASE_URL . trailingslashit($path);
}

function trlg_media_canonical_url(): string
{
    $canonical = trlg_media_public_url_from_request();
    return esc_url($canonical);
}

function trlg_media_output_canonical(): void
{
    echo '<link rel="canonical" href="' . trlg_media_canonical_url() . "\" />\n";
}

function trlg_media_replace_url($url)
{
    return trlg_media_canonical_url();
}

function trlg_media_replace_home_url($url, $path = '', $origScheme = null, $blogId = null)
{
    if (!is_string($url)) {
        return $url;
    }

    $origin = 'https://tsurilogue.tapiyota.com';
    $public = TRLG_MEDIA_PUBLIC_BASE_URL;

    if (strpos($url, $origin) === 0) {
        return $public . substr($url, strlen($origin));
    }

    return $url;
}

remove_action('wp_head', 'rel_canonical');
add_action('wp_head', 'trlg_media_output_canonical', 1);

// Popular SEO plugins.
add_filter('wpseo_canonical', 'trlg_media_replace_url', 20);
add_filter('wpseo_opengraph_url', 'trlg_media_replace_url', 20);
add_filter('rank_math/frontend/canonical', 'trlg_media_replace_url', 20);
add_filter('rank_math/opengraph/url', 'trlg_media_replace_url', 20);
add_filter('aioseo_canonical_url', 'trlg_media_replace_url', 20);

// Make generated links in feeds/sitemaps closer to the public URL where WordPress uses home_url().
add_filter('home_url', 'trlg_media_replace_home_url', 20, 4);
