#! /usr/bin/env bash
# AppRun hook, copied into apprun-hooks/ by scripts/patch-appimage.sh.
#
# patch-appimage.sh strips the bundled GStreamer so WebKitGTK uses the host's.
# This hook makes the rest of the app agree with that:
#
# 1. The AppImage launcher sets GStreamer's system plugin path to the bundled
#    plugin folder only, which no longer exists, so no plugins load (no
#    appsrc, no audio sink). It overwrites that variable, so add the host's
#    plugin folder through GST_PLUGIN_PATH_1_0, which it leaves alone.
# 2. A host GStreamer built against a newer GLib calls symbols the bundled
#    GLib lacks (g_sort_array on Debian 13) and the app dies at launch. When
#    the host GLib is newer, preload it so everything resolves against it.
#    Older hosts keep the bundled GLib, which the bundled WebKitGTK needs.
#
# AppRun runs hooks under `set -e`, so nothing here may fail: a failed hook
# would stop the app from launching at all.

host_lib_dir() {
	local ldconfig_bin path
	ldconfig_bin="$(command -v ldconfig || echo /sbin/ldconfig)"
	path="$("$ldconfig_bin" -p 2>/dev/null |
		awk -v lib="$1" '$1 == lib && /x86-64/ { print $NF; exit }' || true)"
	[ -n "$path" ] && dirname "$path"
	return 0
}

# The GLib family shares one version. The soname file isn't always a symlink
# to the versioned one, so look for the versioned file itself:
# libgobject-2.0.so.0.8000.0 -> 8000. Prints nothing if none is found.
glib_minor() {
	local file version
	for file in "$1"/libglib-2.0.so.0.[0-9]* "$1"/libgobject-2.0.so.0.[0-9]* \
		"$(readlink -f "$1/libglib-2.0.so.0" 2>/dev/null || true)"; do
		version="${file##*-2.0.so.0.}"
		case "$version" in
		[0-9]*.*)
			echo "${version%%.*}"
			return 0
			;;
		esac
	done
	return 0
}

host_gst_dir="$(host_lib_dir libgstreamer-1.0.so.0)"
if [ -n "$host_gst_dir" ] && [ -d "$host_gst_dir/gstreamer-1.0" ]; then
	export GST_PLUGIN_PATH_1_0="$host_gst_dir/gstreamer-1.0${GST_PLUGIN_PATH_1_0:+:$GST_PLUGIN_PATH_1_0}"
fi

# Set APPIMAGE_BUNDLED_GLIB=1 to always use the bundled GLib.
if [ -z "${APPIMAGE_BUNDLED_GLIB:-}" ]; then
	host_dir="$(host_lib_dir libglib-2.0.so.0)"
	host_minor="$(glib_minor "$host_dir")"
	bundled_minor="$(glib_minor "$APPDIR/usr/lib")"

	if [ -n "$host_dir" ] && [ -n "$host_minor" ] && [ -n "$bundled_minor" ] &&
		[ "$host_minor" -gt "$bundled_minor" ]; then
		preload=""
		# GLib's own dependencies come along too: the host GIO needs the host
		# libmount (e.g. MOUNT_2_40), and the bundled copies are older.
		for lib in libglib-2.0.so.0 libgobject-2.0.so.0 libgio-2.0.so.0 \
			libgmodule-2.0.so.0 libmount.so.1 libblkid.so.1 libselinux.so.1 \
			libpcre2-8.so.0 libffi.so.8; do
			if [ -e "$host_dir/$lib" ]; then
				preload="$preload${preload:+:}$host_dir/$lib"
			fi
		done
		export LD_PRELOAD="$preload${LD_PRELOAD:+:$LD_PRELOAD}"
		# GIO modules must match the GLib that loads them.
		unset GIO_EXTRA_MODULES
	fi
fi
