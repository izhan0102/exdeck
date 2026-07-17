/**
 * Remotion configuration for the EXdeck promo video.
 * Run the studio:  npm run video
 * Render the MP4:  npm run video:render
 */
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(null); // auto — use all cores
Config.setChromiumOpenGlRenderer("angle");
