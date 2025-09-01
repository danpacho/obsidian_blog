# @obsidian_blogger/build_system

## 0.6.8

### Patch Changes

- Optimize performance for obsidian reference and build logger

## 0.6.7

### Patch Changes

- Fix obsidian reference collection process, add MOVED, assest moved nodes

## 0.6.6

### Patch Changes

- Rollback, not an error for movement

## 0.6.5

### Patch Changes

- Fix edge case for move files - when from(prev build path) does not existed.

## 0.6.4

### Patch Changes

- Fix unsafe removal process at moved node's duplication process

## 0.6.3

### Patch Changes

- Fix move operation's invalid removal target access

## 0.6.2

### Patch Changes

- Add content_id for clarifying content correctly, fix MOVED transaction opeartion marked as ADDED

## 0.6.1

### Patch Changes

- Fix file movement situation update based on cases

## 0.6.0

### Minor Changes

- Core update for supporting `MOVED` file transaction operation.

## 0.5.15

### Patch Changes

- Fix OS-dependent path segment analyze error at MetaBuilder core plugin

## 0.5.14

### Patch Changes

- Add `MOVED` flag file transaction operation support.

## 0.5.13

### Patch Changes

- Refactor os-dependent file-path management using new class `PathResolver`
- Updated dependencies
    - @obsidian_blogger/plugin_api@0.4.6
    - @obsidian_blogger/helpers@0.5.4

## 0.5.12

### Patch Changes

- Fix `prepare` process logging error related to `updateName`

## 0.5.11

### Patch Changes

- Updated dependencies
    - @obsidian_blogger/plugin_api@0.4.5

## 0.5.10

### Patch Changes

- Updated dependencies
    - @obsidian_blogger/plugin_api@0.4.4
    - @obsidian_blogger/helpers@0.5.3

## 0.5.9

### Patch Changes

- Updated dependencies
    - @obsidian_blogger/plugin_api@0.4.3

## 0.5.8

### Patch Changes

- Enhance core `helpers/io` package for managing file-system efficiently. Updated deps.
- Updated dependencies
    - @obsidian_blogger/helpers@0.5.2
    - @obsidian_blogger/plugin_api@0.4.2

## 0.5.7

### Patch Changes

- Eslint rule updates, update template plugin order
- Updated dependencies
    - @obsidian_blogger/helpers@0.5.1
    - @obsidian_blogger/plugin_api@0.4.1

## 0.5.6

### Patch Changes

- Integrate file read related feature into io, update sync logic for bridge. Fix window related plugin errors
- Updated dependencies
- Updated dependencies
    - @obsidian_blogger/plugin_api@0.4.0
    - @obsidian_blogger/helpers@0.5.0

## 0.5.5

### Patch Changes

- Updated dependencies
    - @obsidian_blogger/plugin_api@0.3.2

## 0.5.4

### Patch Changes

- Updated dependencies
    - @obsidian_blogger/plugin_api@0.3.1

## 0.5.3

### Patch Changes

- Updated dependencies
    - @obsidian_blogger/plugin_api@0.3.0

## 0.5.2

### Patch Changes

- Updated dependencies
    - @obsidian_blogger/plugin_api@0.2.6

## 0.5.1

### Patch Changes

- Updated dependencies
    - @obsidian_blogger/plugin_api@0.2.5

## 0.5.0

### Minor Changes

- Stabilize code building plugins and enhance logics for building metadata

## 0.4.9

### Patch Changes

- Add node exclusion feature for build:tree pipes and change git-related plugin processes

## 0.4.8

### Patch Changes

- Fix param builder os-specific path analysis error

## 0.4.7

### Patch Changes

- Updated dependencies
    - @obsidian_blogger/plugin_api@0.2.4

## 0.4.6

### Patch Changes

- Updated dependencies
    - @obsidian_blogger/plugin_api@0.2.3

## 0.4.5

### Patch Changes

- Updated dependencies
    - @obsidian_blogger/plugin_api@0.2.2

## 0.4.4

### Patch Changes

- Update build info generator for os specific file path handling process

## 0.4.3

### Patch Changes

- Fix os-dependent file system path reading error via refactored FileReader static method
- Updated dependencies
    - @obsidian_blogger/helpers@0.4.1
    - @obsidian_blogger/plugin_api@0.2.1

## 0.4.2

### Patch Changes

- Fix findByBuildPath for os dependent path ruleset

## 0.4.1

### Patch Changes

- Update exported interface of build/publish plugins

## 0.4.0

### Minor Changes

- Stabilize plugin interface and enhance type-safety for plugin responses

### Patch Changes

- Updated dependencies
    - @obsidian_blogger/helpers@0.4.0
    - @obsidian_blogger/plugin_api@0.2.0

## 0.3.6

### Patch Changes

- Update pagination builder core plugin behavior, generate all metadata except "pagination"(self) field

## 0.3.5

### Patch Changes

- Update obsidian reference plugin caching behavior, remove direct access for cache strategy
- Updated dependencies
    - @obsidian_blogger/plugin_api@0.1.3

## 0.3.4

### Patch Changes

- Updated dependencies
    - @obsidian_blogger/plugin_api@0.1.2

## 0.3.3

### Patch Changes

- Minor update for better stability
- Updated dependencies
    - @obsidian_blogger/helpers@0.3.2
    - @obsidian_blogger/plugin_api@0.1.1

## 0.3.2

### Patch Changes

- Update package name : @obsidian_blogger/plugin_api

## 0.3.1

### Patch Changes

- Update package dependency to latest
- Updated dependencies
    - @obsidian_blogger/helpers@0.3.1
    - @obsidian_blogger/plugin@0.2.1

## 0.3.0

### Minor Changes

- Stabilize api structures and update core packages

### Patch Changes

- Updated dependencies
    - @obsidian_blogger/helpers@0.3.0
    - @obsidian_blogger/plugin@0.2.0

## 0.2.6

### Patch Changes

- Updated dependencies
    - @obsidian_blogger/helpers@0.2.3
    - @obsidian_blogger/constants@0.2.3

## 0.2.5

### Patch Changes

- Update decoding logic at plugin and update dynamic config for meta-validator

## 0.2.4

### Patch Changes

- Refactor CorePlugins dynamicConfig and add default exclude

## 0.2.3

### Patch Changes

- Stabilize api for job executions
- Updated dependencies
    - @obsidian_blogger/helpers@0.2.2
    - @obsidian_blogger/constants@0.2.2

## 0.2.2

### Patch Changes

- Fix and stabilize api for build, publish system related modules

## 0.2.1

### Patch Changes

- Stabilize apis and refactor symbols
- Updated dependencies
    - @obsidian_blogger/helpers@0.2.1
    - @obsidian_blogger/constants@0.2.1

## 0.2.0

### Minor Changes

- consolidate @obsidian_blogger packages modules and logics

### Patch Changes

- Updated dependencies
    - @obsidian_blogger/constants@0.2.0
    - @obsidian_blogger/helpers@0.2.0

## 0.1.2

### Patch Changes

- Update build template related components
- Updated dependencies
    - @obsidian_blogger/helpers@0.1.2

## 0.1.1

### Patch Changes

- Update interface of obsidian_blogger packages and make a unstable beta version of publish system
- Updated dependencies
    - @obsidian_blogger/helpers@0.1.1
