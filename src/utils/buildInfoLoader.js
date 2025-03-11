/**
 * Build information loader script
 * This file is used to load the build information from the global window.BUILD_INFO object
 * that is set by the buildInfoRuntime.js file.
 *
 * This script retrieves the build information and updates DOM elements with the appropriate data.
 */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    // Get build info from the global window object
    const buildInfo = window.BUILD_INFO || {
      version: 'unknown',
      buildNumber: 0,
      fullVersion: 'unknown',
      buildDate: 'unknown',
    };

    // Update version display elements
    const versionElements = document.querySelectorAll(
      '[id="version-info"], [id="version-display"]',
    );
    versionElements.forEach((element) => {
      if (element) {
        element.textContent = buildInfo.fullVersion;
      }
    });

    // Update build date elements
    const buildDateElements = document.querySelectorAll('.build-info');
    buildDateElements.forEach((element) => {
      if (element) {
        element.textContent = 'ビルド日時: ' + buildInfo.buildDate;
      }
    });
  });
})();
