# Build an atomic content catalog

Each site build creates one validated content snapshot that reads, validates, renders, and indexes all posts and public project cases before any route, feed, or sitemap consumes them. The build publishes the complete snapshot or fails without silently dropping individual entries. Development rebuilds the snapshot when content changes; this added coordination is accepted to guarantee global invariants and consistent output across every consumer.
