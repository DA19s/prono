import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:io' show Platform;

String getFullLogoUrl(String? logo) {
  if (logo == null || logo.isEmpty) return '';
  if (logo.startsWith('http')) return logo;

  const baseLocalhost = 'http://localhost:3000';
  const baseAndroidEmulator = 'http://10.0.2.2:3000';

  String base;
  if (kIsWeb) {
    base = baseLocalhost;
  } else {
    try {
      if (Platform.isAndroid) {
        base = baseAndroidEmulator;
      } else {
        base = baseLocalhost;
      }
    } catch (_) {
      base = baseLocalhost;
    }
  }

  return '$base${logo.startsWith('/') ? logo : '/$logo'}';
}
