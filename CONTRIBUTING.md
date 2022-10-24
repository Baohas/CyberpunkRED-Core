# Contributing to FoundryVTT Cyberpunk Red System

Our process flow:

> _ideas & discussion -> gitlab issue_card -> personal_branch -> dev -> master -> release_

The **dev** branch is our merge point for code, it represent the code in the state of now, **master** represents the pre-release work, this is for final testing and cleanup by the core maintainers before pushing out a full user release.

To get working on new features and fixes we create a new branch from the **dev** branch, folks should remember to commit early and often, even if the branch is broken/not working, push often too, so that others may pull the branch and take a look at things and possibly help out, and then laslty we create a merge request to **dev** when we all feel it's time that work is functional enough to a part of the system as a whole.

For the _personal_branch_, the convention we have been using is:

> \<personal-identifier\>-\<what-you-are-working-on\> or \<personal-identifier\>-\<issueXXX\>

For instance, a branch where a developer named _Jay_ might be working on the _character sheet_, or if they are working on _issue #7_, might be called:

> **jay-character-sheet-update-skills** or **jay-issue#7**

This document will walk through the installation/configuration of a development environment to help you start contributing.

The assumption of this document is you already have FoundryVTT installed and running on a system and you're planning to utilize that system to do your development work on. This is the easiest option, as you can test your changes in real time.

# Working Environment Configuration

We will cover configuring both Linux and Windows in this document. Regardless of which environment you're using, you will need the FoundryVTT location where it is storing the User Data. See in the OS specific section below where this is located by default.

If your data isn't in this location, launch foundry, connect to your FoundryVTT system, go into Setup and look at the Configuration Tab to see what `User Data Path` is set to. Make a note of this as your **Foundry User Data Path** when it is referenced in the configuration section below.

# Development environment on Linux

We are assuming you are familiar with the distribution of Linux you are using and comfortable with the installation of packages/software. If you're not, ask in the Discord channel and someone can assist with this aspect.

Here's the steps that you will need to perform:

User Data Path default location: `~/.local/share/FoundryVTT/Data/systems`. This may be different if you specify `--dataPath` on the cli when launching FoundryVTT or have changed the `dataPath` in the FoundryVTT options.

Note: The Gulpfile will automatically append `Data/systems/cyberpunk-red-core` to the `dataPath` so it can effectively manage the system.

- Install the package: `git`
- Once installed, open a terminal which will open a terminal and typically defaults to your home directory.
- Clone the repo into your prefered location
    - Example:
      ```bash
      mkdir git
      cd git
      git clone https://gitlab.com/JasonAlanTerry/fvtt-cyberpunk-red-core.git
      ```
- Copy the `foundyconfig.json.example` file to `foundryconfig.json`
- Edit the `foundryconfig.json` file and update `dataPath` to something similar to the below:
    - `"dataPath": "/home/yourname/.local/share/FoundryVTT"`
    - IMPORTANT: make sure yo use the absolute path, not `~/.local/share/...` as Gulp will not expand the `~`
- See the **Build System** section below


# Development environment on Windows

User Data Path default location: `%localappdata%/FoundryVTT/Data/systems/`. This may be different if you specify `--dataPath` on the cli when launching FoundryVTT or have changed the `dataPath` in the FoundryVTT options.

First, you're going to need to download and install git for Windows. You can do that from here:

https://git-scm.com/download/win

After installation, hit your Windows Key then find and run **Git CMD**.

- Clone the repo into your preferred working directory
    - EG: `C:\Users\yourname\Documents`
- Clone the repository with the following command:<br>
  `git clone https://gitlab.com/JasonAlanTerry/fvtt-cyberpunk-red-core.git`
- Copy the `foundyconfig.json.example` file to `foundryconfig.json`
- Edit the `foundryconfig.json` file and update `dataPath` to something similar to the below:
    - `"dataPath": "C:\Users\youname\AppData\Local\FoundryVTT"`
    - IMPORTANT: make sure yo use the absolute path, not `%localappdata%\FoundryVTT...` as Gulp will not expand `%localappdata%`
- See the **Build System** section below

Note: The Gulpfile will automatically append `Data\systems\cyberpunk-red-core` to the `dataPath` so it can effectively manage the system.

# Build system

## Quick Start

- Navigate into the git repo
- Follow the steps above for you OS
- Install the build system requirements
    - `npm install`
- Build the system for the first time
    - `npx gulp build`
- Watch for changes
    - `npx gulp watch`

At this point, you should be able to restart your FoundryVTT server and you should now see **Cyberpunk RED - CORE** listed in your game systems. You can now create a world using this game system to use for testing purposes. As you make changes to the code, you will want to hit ESC in your game world and select "Reload Application" to reload any changes you made to test them.

## Not So Quick Start

We use [Gulp](https://gulpjs.com/) for our build system. This is used to compile/copy code/files from `src/`.

* The `gulpfile.js` imports the tasks from `gulp.tasks.js`

### Dev Configuration

We use a config file to point gulp at your foundry data folder so when running `npx gulp build` or `npx gulp watch` it will build into you Foundry Data directory rather than `dist/`.

**foundryconfig.json**
```json
{
  "dataPath": "/home/ryan/.local/share/FoundryVTT"
}
```

If `foundryconfig.json` does not exist Gulp will build into `dist/` in the root of the repo. You could instead of using the `foundryconfig.json` file simply symlink `dist/` to `${foundrydatadir}/Data/systems/cyberpunk-red-core`.

For the rest of the documentation we will refer to this directory as `dataPath`.

##  Build

To build the project run `npx gulp build` this will build the project into `dataPath`.

## Clean

If is suggested to run `npx gulp clean` often. At least once when starting work on a new branch.

This deletes the `dataPath` ready to be re-created when `npx gulp build` or `npx gulp watch` is run next.

## Watch

While developing the system you will want your changes compiled and rebuilt as you work. To achieve this we provide the command `npx gulp watch`. This watches the files in `src/` and when it detects a change to any file within `src/**/*` it will run the `build` command again and build into `dataPath`.

Depending on which type of files you are working on they may be available immediately, or you may need to either restart the application from the `esc` menu within FoundryVTT or restart FoundryVTT completely.

Rough Guide to which in each situation:

* Available immediately
    * New Image
* Reload Application
    * Updated Image
    * Updated CSS
    * Updated Handlebars/HTML
    * Updated Javascript

NOTE: This does not delete files from `dataPath` if deleted fro `src/`. See **Clean** below for more information.

## Gulp tasks

#### cleanDist

This will delete the `dataPath` directory.

#### compileLess

This will compile `src/less/**/*.less` into `dataPath/main.css`

#### copyAssets

This copies static assets from directoried within `src/` as defined in the `assetsToCopy` variable. This includes things like images, icons, javascript etc.

#### updateSystem

This reads `src/system.json` and uses it as a template to generate the `system.json` needed for releases.

It updates the following fields with the following values sourced from the GitLab CI environment:

##### Production/Release

Example values:

* `CI_COMMIT_TAG="v0.81.1"`
* `CI_PROJECT_PATH="JasonAlanTerry/fvtt-cyberpunk-red-core"`

See the [Gitlab Docs](https://docs.gitlab.com/ee/ci/variables/predefined_variables.html) for more information on CI variables.

* `"version": "${CI_COMMIT_TAG}"`
* `"manifest": "https://gitlab.com/${CI_PROJECT_PATH}/-/jobs/artifacts/${CI_COMMIT_TAG}/raw/system.json?job=build"`
* `"download": "https://gitlab.com/${CI_PROJECT_PATH}/-/jobs/artifacts/${CI_COMMIT_TAG}/raw/cpr.zip?job=build"`

##### Development

As these values don't matter in development we just use dummy values.

* `"version": "0.0.0"`
* `"manifest": "https://gitlab.com/dev/-/jobs/artifacts/0.0.0/raw/system.json?job=build"`
* `"download": "https://gitlab.com/dev/-/jobs/artifacts/0.0.0/raw/cpr.zip?job=build"`

#### watch

This acts as a wrapper around other funtions that watches `src/` for changes then tiggers build workflows as needed.

# Development using git

Checkout this blog which outlines the must-know commands of git, with examples!

> https://dzone.com/articles/top-20-git-commands-with-examples

Checkout this blog which gives examples of how to write good commit messages

> https://cbea.ms/git-commit/

To do development work, simply change into the cyberpunk-red-core directory in your FoundryVTT systems location and then create a new code branch in git:

> `git checkout -b <personal-identifier>-<what-you-are-working-on>`

This is going to create a local branch on your development system and is not visible or saved on Gitlab. When you're done working, or you want to take a break or something, you'll want to save your changes up to Gitlab and typically you would use `git push` to do this however as this is a local branch, it doesn't exist yet on the project on Gitlab. First, you'll need to request _Developer_ permissions on Gitlab. On the project page, click the _Request Access_ link in the center-top of the page. Your request will enter a queue and the team will reach out to better understand your intent. Once that is out of the way, push your branch to the project and set the remote Gitlab as upstream like so:

> `git push -u origin <personal-identifier>-<what-you-are-working-on>`

Once you have done this, you can now see the branch on the project web page here:<br>
https://Gitlab.com/JasonAlanTerry/fvtt-cyberpunk-red-core/-/branches

Unless you actually use `git add` to add changes to your branch, you will not see them on the Gitlab project. You can see the changes that you have made using **git status**:

> `git status`

Then you can either add each file you want to commit:

> `git add <filename/path from git status>`

Or you can add everything with:

> `git add .`

Once you have added the files, go ahead a commit your changes:

> `git commit -m "Some info on what you changes you made."`

As you're working on your branch, you will probably commit/push often to save your work, so fell free to be as descriptive (or not) as you like in your commit notes. We just ask that when you issue your Merge Request to the dev branch, in that request you describe what you have changed and commiting for everyone to see.

Once you have created your commit, you can then simply issue a **git push** to push your branch to Gitlab:

> `git push`

After your commit gets merged into dev, or any other time you want to ensure your local copy of the dev branch matches the version on Gitlab, you can synchronize it with the following:<br>

> `git checkout dev`<br>
> `git pull origin dev`

# Merging to the dev branch

**Always do this before creating a merge request!**
It's important you merge your work with dev locally before creating your merge request.

> `git fetch` # to get all latests info on the repo.<br>
> `git merge origin/dev` # to start a merge to your local work.

Resolve any conflicts, (_feel free to ask for help with this_) and don't always assume YOUR work needs to be what stays, please take your time with this step.
Regardless of which development environment you're using, at some point you're going to be happy with your code and you want to push it to the 'dev' branch. First, ensure you have pushed your changes on your personal branch to Gitlab. Once you have dont that, open your web browser and peruse the project branches here:
<br>

> https://Gitlab.com/JasonAlanTerry/fvtt-cyberpunk-red-core/-/branches > <br>

Locate your personal branch and to the right side of it, you will see a button titled **Merge Request**. Click that button to open the Merge Request Form.<br>

The first thing you are going to want to do is double check the destination branch you would like to merge to. At the very top, just under **New Merge Request** you will see:<br>

> From `<personal-identifier>-<what-you-are-working-on>` into **dev**

If this says anything other than **dev** you are making a request to the wrong branch most likely. _But we trust you._

The **Title** and **Description** should contain information from your commit, however, if you want to update/change them at this time or you didn't really put good information in the commit description (_not as uncommon as you would think!_), go agead and update it now before submitting.
