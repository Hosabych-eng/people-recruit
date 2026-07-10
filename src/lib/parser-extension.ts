/** Keep in sync with chrome-extension/manifest.json version when releasing. */
export const LINKEDIN_PARSER_VERSION = "1.2.1";

export const LINKEDIN_PARSER_DOWNLOAD_PATH = "/downloads/linkedin-parser.zip";

export const LINKEDIN_PARSER_FILENAME = "linkedin-parser.zip";

export const INSTALLATION_STEPS = [
  "Download and unzip the extension archive.",
  'Open chrome://extensions/ in your browser.',
  'Enable "Developer mode" in the top right corner.',
  'Click "Load unpacked" and select the folder you just unzipped.',
] as const;
