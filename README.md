# Cyberpunk RED - Welcome to The Street!
![Release](https://img.shields.io/gitlab/v/tag/22820629?label=Latest%20Release)

![image](/images/Header-VTT.jpg)

A implementation for the Cyberpunk RED TRPG Core Roles for Foundry VTT.


>DISCLAIMER: This game system is unofficial content provided under the Homebrew Content Policy of R. Talsorian Games and is not approved or endorsed by RTG. This content references materials that are the property of R. Talsorian Games and its licensees.

This project is under heavy development to get a working experience together, so please prepare yourself for a lot of change when using this it. We aim to be responsive so if you have suggestions, concerns, or ideas, please come talk to us!

# Getting Started

If you are a game master or player and curious about how Cyberpunk runs in Foundry VTT, [why not check out our extensive wiki articles](https://gitlab.com/JasonAlanTerry/fvtt-cyberpunk-red-core/-/wikis/home), or this [YouTube playlist showcasing updates and walkthroughs.](https://www.youtube.com/playlist?list=PL4-W5wKEr1fm57F9qnF8a7opYJ1pBt36X) If you want to contribute to developing the system, read on!

# Installing

The recommended installation method is with the usual FoundryVTT installer (see the [tutorial](https://foundryvtt.com/article/tutorial/)). Our work is listed as [https://foundryvtt.com/packages/cyberpunk-red-core](https://foundryvtt.com/packages/cyberpunk-red-core).

Manifest: https://gitlab.com/api/v4/projects/22820629/packages/generic/fvtt-cyberpunk-red-core/latest/system.json

# Release Notes

See [CHANGELOG.md](https://gitlab.com/JasonAlanTerry/fvtt-cyberpunk-red-core/-/blob/master/CHANGELOG.md)

# Join the team!

1.  Clone the repo!<br>
    > `git clone git@gitlab.com:JasonAlanTerry/fvtt-cyberpunk-red-core.git`<br>
    Conventions and more details on contributing to the process can be found in CONTRIBUTING.md

2. Check the Confirmed issue list for current issues. If you want to report a bug or help us squish them, [check the list of confirmed issues we know about](https://gitlab.com/JasonAlanTerry/fvtt-cyberpunk-red-core/-/issues?label_name%5B%5D=Confirmed).

3. If you want to bring something new to the table, we have a number of proposed features brought forward by the community. [Check out what we'd like to accomplish and help us out if you have the time!](https://gitlab.com/JasonAlanTerry/fvtt-cyberpunk-red-core/-/issues?label_name%5B%5D=Feature)

4.  Chat with us on [Discord](https://discord.gg/hpyz2nf6Vk)!

# Contributing to the Project

If you're interested in helping out, we would love to hear from you! Even if you're not a coder we can help you get started. Never too late to start a new hobby! Look over the [project wiki](https://gitlab.com/JasonAlanTerry/fvtt-cyberpunk-red-core/-/wikis/home).

Read on to get a sense of the project's direction, the tools we use, and how we're organized. If you're still interested, continue to [CONTRIBUTING.md](https://gitlab.com/JasonAlanTerry/fvtt-cyberpunk-red-core/-/blob/dev/CONTRIBUTING.md) to set up your dev environment.

## Useful Tools

Have a look through here to get a sense of what you'll be using when contributing code to this project. You do not need to be an expert in all these things, they're provided as an overview.

- Our recommended IDE is [Visual Studio](https://code.visualstudio.com/) for editing JavaScript, CSS, and HTML.
- Since our source code lives in gitlab, you'll need to understand [git](https://git-scm.com/).
    - This [article](https://dzone.com/articles/top-20-git-commands-with-examples) helps with understanding the concepts.
    - [This](https://cbea.ms/git-commit/) page covers how to write good commit messages.
- [nodejs](https://nodejs.org/en/) is a big deal too. You'll use npm to manage packages.
- Foundry uses [Handlebars](https://handlebarsjs.com/) to product HTML templates.
- Of course, you'll need to be aware of the [FoundryVTT API](https://foundryvtt.com/api/), and read through how to do [system development](https://foundryvtt.com/article/system-development/) in it. Lastly, there's always the [Foundry wiki](https://foundryvtt.wiki/en/home) for more help.

## Useful and helpful links to learn what you need to get started with helping!

- https://dzone.com/articles/top-20-git-commands-with-examples
- https://cbea.ms/git-commit/
- https://foundryvtt.com/api/
- https://foundryvtt.com/article/system-development/
- https://handlebarsjs.com/
- https://foundryvtt.wiki/en/home

### Repository Layout

- All system code is located in the `src/` subdirectory. These files are then compiled/processed by our buldsystem which utilzes [Gulp](https://gulpjs.com/).
- `src/system.json` and `src/template.json` are necessary pieces to building a game system with Foundry. Check out the Foundry documentation for details on what those files are for.
- `serc/less` this is where all of our css fragments are kept, these fragments are then built uding Gulp as described above. If you want to mess with the style and presentation of the UIs, this is the place.
- `src/lang` is where we keep internationalization templates, but we only support English today
- `src/templates` is where the Handlebars templates live, which are transformed into HTML documents by Foundry when the time is right. Folks with an interest in improving the UIs will work in here.
- Lastly, the `src/modules` directory is where the JavaScript that extends Foundry functionality is kept. This is where the plumbing exists to make the UIs do useful things.

## Setting Up Your Development Environment

For your first contribution, please make sure it is aligned with something in Gitlab first. If you have other things in mind, bring them in up Discord and see what the team thinks. More seasoned and regular contributors will get additional permissions in Gitlab to help steer and guide the project.

Setting up your environment is covered in [CONTRIBUTING.md](https://gitlab.com/JasonAlanTerry/fvtt-cyberpunk-red-core/-/blob/dev/CONTRIBUTING.md) now.

### Icon Art Style

Icons should be SVG is possible. Actor Icons should be WEBP or PNG.

All icons should follow the same colorscheme:

* Background: `1B1F21FF`
* Foreground: `E64539FF`
* Shadow: `3A3F5EFF`

To recreate the effect on the icons you can use the following in Inkscape:

0. Set background to: `1B1F21FF`
0. Ensure the foreground is a single object
  0. Select all paths
  0. Path > Union
0. Set the foreground object path (and stroke if used) to: `E64539FF`
0. Select the forground object
0. Filters > Dropshadow:
    * Radius: `Variable`
        * Adjust till it doesn't look terrible, low 0-10 for images with small narrow parts, 20ish for more solid images
    * Horizontal: 0
    * Vertical: 0
    * Type: Inner
    * Colour: `3A3F5EFF`

To recreate the effect on game-icons.net

0. Set background shape to square
0. Change background gradient colour to `1B1F21`
0. Change foreground gradient colour to `E64539`
0. Enable foreground shadow
0. Set foreground shadow to side in with blur size 15
0. Change foreground shadow colour to `3A3F5E`
0. Download as `.svg`
