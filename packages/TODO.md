# LoadMap 🦦

## Make BuildSystem

1. [x] gray-matter + [remark-front-matter](https://github.com/remarkjs/remark-frontmatter)
    - parse user defined front-matter, `---` in [markdown](https://github.com/jonschlinkert/gray-matter?tab=readme-ov-file#stringify)
    - generate front-matter -> static build
        - [routing params] static generation
        - [routing href] static generation
        - [other... user defined meta data] static generation
    - inject generated front-matter into md file -> remark-front-matter
2. [x] static path builder for astro routes
    - https://docs.astro.build/en/guides/routing/
3. [x] Public folder also included
    - https://github.com/BryceRussell/astro-public
4. [x] Improve build performance and enhance build system caching process
5. [] Improve Error Handling at `StateFul` & `Promisify`
    - base error
    - file `IO`
    - `build system` **error**

## Make PublishingSystem

1. vercel automatic deployment
    - https://docs.astro.build/en/guides/deploy/vercel/#project-configuration
2. automatic pagination feature >> optional
    - https://docs.astro.build/en/guides/routing/#pagination
3. astro-satori
    - https://github.com/cijiugechu/astro-satori?tab=readme-ov-file
