# TODO

[ ] - Refactor build system `build:tree` phase

- it should have two major function:

1. `buildNode(node: Node): Node`
    - this function should be called for each node in the tree
    - it should return a modified node
2. `buildTree(tree)`
    - this function should be called once for the whole tree
    - it should return a modified tree
