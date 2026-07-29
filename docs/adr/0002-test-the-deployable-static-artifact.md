# Test the deployable static artifact

Release decisions are based on the generated `out/` site built with a representative non-empty `BASE_PATH` and served by a static file server. Development-server tests remain useful for fast feedback, but they do not satisfy the release gate because they cannot prove GitHub Pages routing, assets, metadata, feeds, or 404 behavior. This accepts a slower release check in exchange for testing the system that is actually deployed.
