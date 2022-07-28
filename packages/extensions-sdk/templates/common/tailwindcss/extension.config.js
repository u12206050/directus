module.exports = {
	plugins: [
		{
			name: 'always-transform-styles',
			options(opts) {
				if (opts && opts.plugins) {
					const styles = opts.plugins.find((plugin) => plugin.name === 'styles');
					styles.shouldTransformCachedModule = () => true;
				}

				return opts;
			},
		},
	],
};
