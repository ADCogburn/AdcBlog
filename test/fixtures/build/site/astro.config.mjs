// The real site — config, pages, layouts and collections — built against this
// fixture's content. Collection `base` paths resolve against the root (this
// directory), so ./src/content/* here supplies the Posts and Archives while
// srcDir supplies everything else.
import config from '../../../../astro.config.mjs';

export default { ...config, srcDir: '../../../../src' };
