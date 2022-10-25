# Version 0.84.0 | Date: WIP

**New Features**
-

**Changes**
- Drugs can now be equipped, owned, or carried.

**Bug Fixes**
-


# Version 0.83.1 | Date: 2022-10-23
**Bug Fixes**
- #529 - Fix non-shop containers having the wrong button
- #536 - Spelling mistake: "Ememies" (English)
- #495 - Ability to use UUID links in Character sheets or Item sheets.
- Fixed location of Lifestyle Data for Tragic Love Affairs and Affectations.
- Fix rolling initiative before combat has started
- Fix weapon upgrades that are secondary weapons to work correctly
- Fix cyberdeck program installation where it was adding the item._id under item.system
- Fixed regression where filteredItems was re-introduced back into the system. This was replaced with actor.itemTypes in 0.82.0
- Fixed an issue where attempting to delete a ledger line would throw an error
- Fixed a couple migration issues:
  - When a migration failed for any reason, on the next run through it could corrupt
    upgraded items
  - When running migration through multiple levels of migration, it was possible that
    the world data model version would be set incorrectly because the code did not await
    the update of the world data model version.  This would cause migration to execute a
    second time which may cause problems.


# Version 0.83.0 | Date: 2022-10-02

**New Features**
- New UI for modifying Mook skills on the Mook sheet
- Drugs can be used in the Mook sheet
- Stackable items can be dragged to the Mook sheet and stacked properly

**Changes**
- Automatic babele folder configuration, so that it does not have to be set by the user.
- Mook portrait is always shown
- A few minor UI improvements to the Mook sheet

**Bug Fixes**
- #476 - Vehicles cost can now be edited
- Cyberware & Upgrade templates still had some references to .data causing the shim to fire.
- #469 - Fixed icon display for Foreign Object Critical in Rollable Tables
- #507 - Black ICE Class does not appear to save
- #520 - Splitting items works again


# Version 0.82.1 (Hotfix) | Date: 2022-09-23
- Fix an issue where the mook sheet notes were not writable
- #494 - Cyberware weapons were corrupting data points


# Version 0.82.0 | Date: 2022-09-22

**New Features**
- Foundry V10 Compatibility
- Spanish translation! Thank you ZRAAA78!

**Changes**
- Nothing worth noting

**Bug Fixes**
- #473 - Fashionware foundational item not migrated to v10
- #472 - EMP & Luck Values/Max greater than 9 mess with the formatting.  If a user enters a value > 9, a warning banner is shown letting them know there will be formatting issues and the formatting changes to make it more obvious something is amiss.
- #468 - Actor image goes outside border over text fixed (overflow hidden).
- #474 - Replaced `filteredItems` on `Item` types with scoped, relative properties called `relativeSkills` and `relativeAmmo` for specific items which require these data points.
- Replaced all instances of filteredItems with actor.itemTypes (native to Foundry). This addressed an issue causing very slow loading times of the resources tab in the token configuration dialog.
- Removed the need for installedPrograms data to be stored on the actor which was noticed during the filteredItems cleanup.
- #490 - Vehicles still using v10 data/system shim.
- #486 - Autofire Skill correctly used when autofire toggle applied in fight tab

**Maintenance Releases**

# Version 0.81.5 (Hotfix) | Date: 2022-09-20
#467 - Fix shield ablation arrow in Fight Tab to be functional
#461 - Throw an exception if someone enters a decimal point when modifying eurobucks.
#477 - Autofire functionality is not working from the Fight Tab
#468 - Actor image goes outside border over text
- Item Upgrades & Cyberware which are weapons no longer get their item data corrupted when opening the item sheet

# Version 0.81.4 (Hotfix) | Date: 2022-08-21
#464 - Fix issue where containers corrupt eurobucks amount for non-stackable items

**New Features**
- Polish support available!

# Version 0.81.3 (Hotfix) | Date: 2022-08-02
**Bug Fixes**
- When installing cyberware and selecting `None` for the Humanity Loss, the maximum humanity was not being decremented forcing one to re-calculate it using the calculator.
- Corrected  an issue with Compendium Migration where `Scene` type Compendia was not properly being migrated.
- #437 - Chat Card shows armor ablation even if target has no Armor
- #419 - Invert function of CTRL Rolls creates an issue with Primary Role Abilities
# Version 0.81.2 (Hotfix) | Date: 2022-08-02
**Bug Fixes**
- #458 - The rulers for the DV Calculation is broken for tables with regexp characters in the name [such as (Autofire)]
- #455 - Containers/Vendors issues (non-English settings)

# Version 0.81.1 (Hotfix) | Date: 2022-08-01
**Bug Fixes**
- #456 - Selling non-stackable items to vendors results in a NaN offer from the vendor
- #454 - Kendachi Mono-Three has Incorrect Attack Bonus
- #452 - Migrated Excellent Quality Weapons have no Bonus to Attack
- #451 - All Migrated Weapon Icons Changed to Heavy Pistol

# Version 0.81.0 | Date: 2022-07-31

**New Features**
- #225 - Active effects for Items
  - Active Effects are a Foundry feature that allow items to apply modifications to stats and skills of characters in the game. Active Effects can also be added to Characters arbitrarily without associating to an item.
  - An Effects tab on the actor sheet has been added to summarize where active effects are coming from. From there character-level effects can be
    managed. (create/toggle/edit/delete). Effects from Items cannot be edited or deleted from this tab. Mooks do not yet enjoy Active Effects.
  - An Active Effect has a "usage" associated with it on an item. This affects when the effect will be applied. Examples are when carried, when equipped,
    toggling it on/off yourself or always on. Some specialized ones exist too: Cyberware allows for "when installed." More may be added in the future.
  - The following item types can have Active Effects added to them: armor, clothing, drugs (more on that next), gear, cyberware, weapons, and
    injuries (see #290).
  - Active effects can be applied to stats, skills, role abilities, a handful of derived stats (like HP), or custom keys in a manner similar to what 5E
    expects. Only plain addition or subtraction modes are supported.
  - A MOD column has been added to the Role tab in a manner similar to what we have for skills already. Like skills, this makes it clear which abilities
    are being affected by an Active Effect.
  - Arbitrary skill mods on characters cannot be set in the character sheet any more, that column shows mods coming from active effects now. You can
    still create skill mods with active effects using the Effects tab.
  - Active effects can affect skills on a character, even custom skills. Note that there is a known issue where a custom skill does not always show up
    the first time any character is opened. (see issue #440 for details) Closing an reopening the sheet fixes it for the rest of that session.
- #305 - Drugs and Consumables
  - The Drug item type has been added and has a unique action and usage. This is meant to model consumables, meaning items that stack and can be consumed
    to enjoy some stat or skill benefit.
  - Consuming a drug will reduce the amount by 1 and enable any active effects with the "when consumed" usage set.
  - If you implemented drugs with a different item type before you may want to re-create them with the new type.
- Feature Request #295: EB Ledger for Shop Container Actors
- Feature Add: Player ability to sell to Vendors by drag/dropping from character sheet to Vendor.
  - Vendors have been enhanced with the ability to allow players to sell to them. The type of items the vendor is willing to purchase is configurable and each item type can have a set percentage to offer for to purchase the item.  Example: Setting armor purchase percentage to 80, will offer a player 80eb for a piece of armor that has a value of 100eb.
- Feature Request #179: Add ability to track reputation and roll face down (Works for Mooks as well since MR !625).
- Add Light/Medium/Heavy/Very Heavy Generic Melee Weapons.
- Support for the Drag Ruler module
- Feature Request #424: Ability to use LUCK on Stat, Skill, Attack, Program, Cyberdeck, and Interface/Charismatic Impact rolls. Automatically deducts from character sheet.
- #414 - German is now a supported language. Most game system text (excluding pre-made items) will appear in this language if set in game settings. Thank you to our German translators: High123, Similar and Tealk.


**Changes**
- Feature Request #352: Removed the fixed height CSS for the "Player Notes" section in the lifepath tab for a better writing/reading experience.
- Consolidated gain, lose and set ledger functions for EB, IP and Reputation to make it more manageable.
- #244 - Remove unused data points in the template
- Substanial refactoring of the item code to support Active Effects and improve maintainability.
- Added possibility to describe a "/red" roll with a description, e.g. "/red 1d10 # This is my roll!". The description of individual dice is not possible
- Feature Request #378: Add ability to share actor artwork to players from the character sheet by right clicking on the Actor's image.
- Feature Request #379: Added ability to populate a NET architecture with the help of rolltables. It also rolls for the number of floors (3d6) and how many branches there should be. (see p. 210 in the book)
- Even more icons!
  - Icons for each street drug
  - Icons for each pharmaceutical
  - Even more status icons
- Change Character sheet Wound State to unique icons rather than the font-awesome smileyfaces
- CUB Condition Map json file, ready to be imported to CUB Condition Lab
- Format Eurobucks displays in a more readable way
- Use fantasy style icons for items when generating the ELO Armory
- Add Head armor generation to ELO Armory Macro
- Add missing Lifepath questions
- Fix ordering of Lifepath items to match Book order
- Rename Excellent/Poor Quality Weapon/Cyberdeck Compendium items for easier sorting
- Add `walk`/`run` as derivedStats
- Feature Request #352: Removed the fixed height CSS for the "Player Notes" section in the lifepath tab for a better writing/reading experience
- Consolidated gain, lose and set ledger functions for EB, IP and Reputation to make it more manageable
- Renamed included maps to better differentiate them from other map packs
- Containers now default to neutral token disposition
- Added Medtech drugs to the compendium
- Added thrown weapons to the compendium and a thrown weapon DV table
- Clarified the effect of the whiplash head critical injury
- Added a unique icon to the Flamethrower
- Feature Request #308: Renamed 'Datapoint' to 'Attribute' and renamed 'Item Upgrades' to simply 'Upgrades'
- Feature Request #330: added Skin Weave and Subdermal Armor to the Armor compendium
- Added a line break to the deathSaveIncrease summary line to enable easier reading
- Adjusted wording for several critical injuries to reduce ambiguities
- Adjusted the formatting of issues templates for easier filling out
- Set upgrade slots to 0 on melee, cyberware, and exotic weapons in the compendium
- Re-wording of Bows/Crossbows descriptin in compendium
- Fix Item Sheet upgrade display count to correctly show upgrade usage
- Greeter text (the post-migration pop-up window) is displayed as HTML rather than plain text
- Changed migration status to use a status bar instead of flooding the screen with status messages
- Ammo can be concealed, and can no longer be "upgraded." Different ammo types (rubber, toxic, etc) are still intact.
- A few changes to your world may have been made as part of migration activities.
  - Some fields on items were given defaults if they are empty. For example a null price or price category is set to something befitting the
  item type. It is still a guess, but now there is possibly correct data instead of definitely wrong or useless data.
  - Clothing and gear upgrades were converted to active effects.
  - Armor, programs, netarch, vehicles, and weapons cannot be stacked any more. Duplicate items may have been created (up to 50) in players' inventories.
  - The *quality* field has been removed from items (weapons, cyberdecks and vehicles) to avoid confusion about whether to change values in other fields.
    You can still use the name and other fields (such at attack modifier) to express excellent quality items.
  - Some item types (weapons, vehicles) no longer "stack." They do not have an amount field any more.



**Bug Fixes**
- Corrected an issue when a player did not have proper permissions on a vendor, the purchase would fail, but the player would still be charged for the item
- Fixed the ability to delete items from the Mook sheet
- Fixed #367: As a GM, if you attempted to use a macro to roll a skill without having an actor selected, it failed with a traceback. We now catch this and throw an appropriate message
- Fixed #373: Expansive Shotgun Slug ammunition is now usable with the Shotgun (and not the Heavy Pistol)
- Fixed #380: Corrected various typos
- Corrected various spelling and formatting issues in the changelog
- Fixed #377: Certain clothes have null as description instead of empty string
- Fixed #374: Mook sheets now correctly show the updated magazine size when an item upgrade that changes it is used
- Fixed actor sheet content filter not working anymore
- Fixed #386: Basic weapons in the compendium didn't have their range tables set
- Fixed #375: Read attackmod for both cyberware & weapons, previously cyberware was ignored
- Fixed #387: Fixed adding macros for cyberware weapons
- Fixed #390: Rubber Shotgun Slugs are considered Heavy Pistol Ammo
- Fixed #416: Excellent Weapons missing +1 to attack
- Fixed #433: Fixed some hard-coded text to now use the localized strings
- Fixed #431: Mook sheets now correctly show the skill total instead of NaN
- Fixes #446 & #447: Fixes issues with Max Humanity and Empathy getting set properly when installing Cyberware
- Fixes #449: The stat value now shows on a stat roll card
- Fixes #450: Unable to delete ledger lines for a container type actor

**Maintenance items**
- Moved preCreateItem hook from actor.js to item.js and combined the code of createItem hook from both actor.js and item.js into item.js
- Added a warning popup if a macro is using actor.addCriticalInjury() alerting a user to the eventual deprecation of the method.  [Please see the updated API Wiki for details on the new way to create a Critical Injury from a Macro.](https://gitlab.com/JasonAlanTerry/fvtt-cyberpunk-red-core/-/wikis/System-Documentation/API/addCriticalInjury)
- Removed shading from the "Cancel" button on dialogs which may have inadvertently made people believe it was the default
- Renamed method _favoriteVisibility to _toggleSectionVisibility and CSS tag toggle-favorite-visibility to toggle-section-visibility as it accurately describes what happens
- Updated the prompt naming for the cyberware installation to be consistent with code
- Consolidated the interface to get Roll Tables from the system into a method in systemUtils that can either use a regular expression or not

# Version 0.80.1 | Date: 2021-01-04

**Hot Fix**
- Addressed #352: Removed the fixed height CSS for the "Player Notes" section in the lifepath tab for a better writing/reading experience.
- Fixed #354 - Item Upgrades should be removable again and additional upgrades can be installed.
- Fixed #355 - Drag and drop to hotbar restored
- Corrected many French translation strings

# Version 0.80.0 | Date: 2021-12-23

**New Features**
- Updated the system for Foundry v9 compatibility. No further updates will be provided to the 0.8.x release. [Please backup your data before attempting any major upgrade!](https://www.youtube.com/watch?v=OmbxMmqNNXU)
- Added functionality to delete single ledger lines for the GM. Players are not able to do so.
  - It is possible to not only delete the line in the ledger, but also change the value up or down upon deletion.
- Added functionality to manually increase the Death Save Penalty of a character. This is useful in case a character gets hit, while Mortally Wounded.
- Many new icons added to items in the compendiums! See CREDITS.md for attribution and thanks!

**Changes**
- When a release update is applied, a pop up window will now display with relevant information:
  - At a minimum, there will be a link to the CHANGELOG for the release
  - If there is a corresponding video which demonstrates new feature functions, it will also be linked off of the popup
    - DEV NOTE: To add this, simply configure the flag for the Video URL `system.json` and it will be automatically displayed
  - If there are specific configuration instructions for a release (example: import the DV Tables Rolltable, or import Critical Injuries), they will also be provided in this pop-up.
    - DEV NOTE: To add this, simply create a new text file with the instructions in `lang/release-notes` with the name `v${version}-${lang}` and it will be automatically displayed
- Actor damage application function has a new boolen argument to specify if the damage is lethal or not.  Non-lethal damage will not reduce an actor below 1 hit point.
- Mook sheets have been modified to correct a few problems:
  - Additional item types will now appear on a mook sheet, including clothing and cyberdeck items (they were previously invisible if something went wrong).
  - Cyberware can be installed or uninstalled by pressing Shift-Click (SHIFT key + Mouse Click) on the cyberware item. By default when dragging cyberware it will still prompt you to install it. Installed cyberware cannot be dragged, so must be uninstalled first.
  - All items on a mook can be dragged between sheets, allowing the GM to "loot" mooks on behalf of player characters.
  - Several changes to the GitLab README to assist with introducing new developers to the system (Join Us!)

**Bug Fixes**
- Rubber ammunition no longer ablates armor and will not reduce an actor to below 1 hit points per RAW.
- Fixed #286 - The item data was not being passed when dragging from a Mook sheet causing the drag/drop to fail. This has been resolved.
- Fixed #298 - DV ruler will attempt to automatically use the Autofire DV Table if an Autofire DV Table exists.
  - NOTE: If your wielded weapon does not have a DV Table associated with the weapon item settings (example Assault Rifle), there is no way to know what the "proper DV" table is for this weapon, therefore if your Token already has a DV Table set on it of a weapon that also has an Autofire mode (example SMG), when you enable the Autofire radio button on the Assault Rifle, it will change to the SMG Autofire DV Table.  Best practice: Set DV Tables on the weapons themselves.
- Fixed #328 - Deletion Icon for some Roles was hidden, due to a short name of the role abilities compared to the role name.
- Fixed #254 - Deleting an unlinked token that has a sheet open will now close that sheet as it is rendered useless.
- Fixed #329 - Containers are not randomly forgetting their settings anymore.
- Fixed comments in the default macro that gets created when you drag a weapon to the hotbar to correctly provide the settings for a ranged weapon attack.
- Fixed #331 - The actor role tab now uses the proper localisation string for deleting the role item.
- Fixed #337 - Added missing Bohemian Jacket. Corrected name of Asia Pop Mirrorshades and Mr. Studd.
- Fixed #339 - Added missing Tracer Button.
- Fixed #335 - The Media Role Ability now uses the associated rank as a modifier.
- Fixed #342 - Medical Grade Cyberlimbs are missing
- Fixed #343 - Allow Smartglasses to take cybereye options. Add Smart Lens from Microchrome. Move Battleglove to gear.
- Fixed #334 - Missing translation strings for initiative (Meat/NET option) has been re-added and cyberware-based initiative is now working correctly.This requires a Netrunner to have the 'Netrunner' role assigned. Rezzed programs granting SPEED bonuses will be added as a modifier in accordance with pg. 205 of the core rulebook.
- Fixed #349 - Installed cyberware properly supports "Ctrl+Click" to send details to the chat window.
- Fixed #350 - Fixed uninstalled cyberware on a mook sheet being impossible to delete if the original install failed.
- Fixed a couple missing translation strings related to synchronizing armor SP to resource bars

# Version 0.79.1 | Date: 2021-09-11

**Hot Fix**
- Fixed #325 - DV ruler broken. Restored by naming the function.

# Version 0.79.0 | Date: 2021-09-11

**Hot Fix**
- Fixed #325 - DV rulers broken when a DV table is set

# Version 0.79.0 | Date: 2021-09-11

**New Features**
- Added support for automatic damage application on Characters and Mooks.
  - The damage chat card of weapon attacks now has an additional button to apply the damage to the selected tokens.
  - A prompt showing the tokens, which will be damaged is shown. It can be skipped by holding the ctrl key while clicking.
  - Double damage for the head location and half SP for melee and martial arts attacks are respected.
  - Bonus damage from critical injuries is always applied, as it penetrates the armor.
  - Damage dealt by programs is directly applied to the HP. No rezzed defender program (e.g. Armor) is considered. If you have any damage reduction while netrunning please apply the damage yourself.
  - Any damage will be applied to a Demon or Black ICE, even if it is meat space damage. It is not checked, that the damage came from a program.
  - For each token, where the damage was applied a chat card with the HP reduction and armor ablation will be shown. In case the armor prevented all damage it will also be told.
  - The damage application does not consider any Solo role abilities, as the damage reduction of it is only applicable once per round.
- Implemented Critical Initiative per RTG release of FAQ 1.3 (FR Issue #288).
  - NOTE: This feature is ENABLED by default as it follows RAW, however may be disabled via the System Settings.
- Implemented CPR Roll Cards for Initiative.
  - Solo Role Ability `Initiative Reaction` is taken into account when rolling Initiative.
- Implemented proper initiative rules for Net Combat.
  - If a character or mook has a cyberdeck equipped when rolling initiative, you will be prompted whether you are rolling for Meat or Net combat as the calculation used depends on this.
- Roles are now items which allows for creation of custom roles and better handling of their functionality.
  - Can configure role abilities to roll with different skills for different situations like the Tech's Upgrade Expertise ability.
  - Can configure flat bonuses to attack, damage, and skill rolls for situations like the Solo's Precision Attack or the Nomad's Moto.
  - Compendium of all the core Roles is included for ease of getting started.
  - BREAKING: Netrunners must select which role should be utilized for netrunning from the "Configure Active Role" dialog on the main part (left) of the character sheet, otherwise you will not be able to utilize the cyberdeck tab of the character sheet. This will be selected for you on migration if you had the Netrunner role selected on a character previously, but will need to be configured on new characters.
- Added filter capability for Skills & Gear.  This is a client side option which can be enabled/disabled in the System Settings.

**Changes**
- Feature Request #296: Exotic Weapons from the Core Rulebook are now present in the Weapons Compendium. The Battleglove has been placed into Cyberware Compendium, and Battery Pack has been placed into the Ammo Compendium.
- Feature Request #319: Item Upgrades are now accessible on a Mook sheet. This includes support for Underbarrel weapons which will display as a usable weapon.

**Bug Fixes**
- Fixed #292: Attempting to delete installed cyberware is prevented now, as it can leave the actor in a broken state.
- Fixed #294: Cybersnake and Vampyres cyberware items from the compendium now display their weapon stats in the fight tab.
- Fixed #318: Underbarrel attachment item upgrades in the compendium now pre-select the appropriate ammo types.
- Fixed #320: The missing Scorpion.png file is now available in the system icons/netrunning folder. Thanks again to Verasunrise and Hyriu33 for the artwork.
- Fixed #322: Cyberware ranged weapons were not having their ammunition auto-decrement.
- Fixed #323: Cyberware weapons now show as weapons in the Mook Sheet.
- Fixes #317: Before adding a Role Item during migration, added a check to see if one exists already.  Also added code to the data model migration to remove the `roleskills` data point which should result in zeroing all of the role skills on that actor.  This datapoint can be removed next release.
- Fixes #324: This bug was introduced with the new initiative code so it never made it to master.  Critical damage should work again.

# Version 0.78.2 | Date: 2021-08-12

**Hot Fix**
- Fix missing import statement in macro code, which prevented all macros generated by dragging items to the hotbar from functioning.

# Version 0.78.1 | Date: 2021-08-04

**Hot Fix**
- Fixes issue #289: There was a naming conflict on Handlebar helpers between `CPR` and the module `Better Roll Tables`.  This hotfix prefixes our helper with `cpr` to avoid this conflict.  A more permanent solution will be implemented for all helpers next release.

# Version 0.78.0 | Date: 2021-08-03

**New Features**
- Cyberware Items which act as weapons can now be configured as such
  - Core Rule Book Examples: Popup Weapons, Big Knucks, Wolvers, etc
  - These weapons will show in the Fight Tab as Cyberware Weapons under the standard weapons
- Introduction of the Item Object: Item Upgrade
  - Initial implementation of the Item Upgrade Object enables:
    - Upgrades to Weapons, Cyberdecks, Cyberware, Clothing, Armor and Gear
    - Weapons
      - Adding weapon attachments to weapons to can modify settings for ROF, Attack Modifier, Magazine Size & Damage
        - For each of these data points, you have the option to modify or override the value of them allowing for flexibility in upgrade attachments
        - Core Rule Book Examples: Drum Magazine, Extended Magainze
      - Adding a secondary weapon as an attachment
        - Core Rule Book Examples: Grenade Launcher Underbarrel, Shotgun Underbarrel, Bayonet
    - Cyberdecks
      - Item Upgrades occupy Option Slots, so it is now possible to use Item Upgrades to install & track Hardware Upgrades to the Cyberdeck
        - Core Rule Book Examples: Backup Drive, DNA Lock, Range Upgrade, etc.
      - Item Upgrades can be added to expand the amount of slots in the Cyberdeck. While there's no RAW for this, it has been added to support Homebrew.
        - Example: USB Drive, External Drive, etc..
    - Cyberware
      - As some Cyberware is now Weapon Items, Item Upgrades can be used to add Attachment to these Weapon Types
        - Example: Popup Assault Rifle w/ Underbarrel Grenade Launcher
        - Note: While it is possible to install an Item Upgrade Weapon Attachment on a non-weapon cyberware, it will NOT display on the Fight Tab as it is not associated with a Cyberware Weapon
    - Clothing
      - Clothing can now have upgrades applied to them to modify COOL and the "Wardrobe & Style" Skill Rolls.
        - Overriding stats/skills is not supported, all values will be treated as a modifier.
        - Note: If the upgrade applies to COOL, it will affect ALL rolls of COOL (COOL Skills too).
    - Armor
      - Armor can now have upgrades applied to modify their SP on the head and/or body as well as to increase the HP on shields
      - NOTE: Due to the way the shield mechanics work, you'll have to repair the shield after installing the item upgrade
    - Gear
      - Gear can now have upgrades applied to them that will allow equipping of the Gear to affect rolls of a base stat.
        - This will allow capability to create Gear items, such as certain drugs (Black Lace, Boost and Synthcoke) and add an Item Upgrade to affect the core stat. Ideally this will be covered with Active Effects, when we get to implementing that, but this is one way to do it for now.
- Inventory items which are upgraded will have a unique "U" identifier appended to their name
- When actors own an Item Upgrade Object, any items they own which match the Item Upgrade Type will have an action item added to their line in the inventory allowing you to easily install the upgrade to that item.
- An "Item Upgrade" compendium has now been provided with examples of Cyberdeck and Weapon Upgrades.
- Added possibility to split items into separate stacks for ammo, gear and clothing.
- Some Items can now be automatically stacked, when dragged onto the character sheet or being purchased/taken from a container. This is enabled for the following Item types: Ammo, Gear, Clothing
- Added feature to purchase/take only a part of the items offered in a container actor.
- Elflines Online
  - A compendium has been added with 2 macros
    - `Create an Elflines Online Character`: This macro will create a blank Elfline Online Character with skills as defined from the Elflines Online Skill List in the Elfline Online compendium released by RTG.
    - `Create Elflines Online Armory`: This macro will create a folder of items as defined from the Elflines Online Armory in the Elfline Online compendium released by RTG.
- Added Martial Arts weapon type, as it is slightly different from the Unarmed weapon type with the scaling for the damage in the case of a BODY of 4 or under while having a cyberarm (rule book pages 176 and 178)
- Introduced a limited view of the mook sheet when a player only has limited permission on the mook
- A compendium for clothing has been added (thanks @aarong123!)
- Help article buttons (?) are now available on items when viewing them in the top-right corner. This will redirect you to the associated item help page on our wiki.

**Changes**
- Newly created actors and items will automatically have default icons configured.
- Restructured the language file for easier translations.
- Added test cases for code quality: The english language file is checked for unused strings and the changelog is checked for changes with each merge request.
- Skills are now also sorted alphabetically on the character sheet if translated into languages other than English.
- The price of an item is interpreted as the price of a single unit of an item. This has been now clarified with a text upon hovering over the word "Price" in the item setting page.
  - The single unit of an item is 1, with an exception for some of the ammunition, where it is 10. Please have a look at the rule book page 344 for that.
- The container sheet inventory will now stretch with the window length vertically
- Many, many little tweaks and improvements to the French translation (thank you @h.gelis and @thevincekun)

**Bug Fixes**
- Fixed #263: New containers now show infinite stock option, as they are initialized as a shop.
- Fix #265, #266, #267: Gear tab now remembers scroll position.
- Fix #276: Items can be transferred from unlinked actors
- Fixed, that number of options slots were not displayed in the item sheet description tab for foundational cyberware.
- Fixed #262: Missing Expansive, Rubber and Smart Ammo for Very Heavy Pistols has been added to the compendium. Basic Grenade and Basic Rocket have been removed and should not exist according to allowed ammo type rules.
- Fixed #287: Typing "/red Xd6" would produce "criticals" whenever the initial result was 6. This has been fixed to behave like a normal damage roll.
- Fixed #285: Character sheet, Roll Tab, Abilities' names are truncated unless you have Medtech on the list.
- Fixed #260: Players can move container actors - added another configurable option to allow players to move containers. The defaults are: Stash:yes, Loot:no, Shop:no, Custom:configurable
- Fixed #261: Container actor tokens are not persisting their configuration when the token is unlinked - Foundry appears to share flag settings between actor & tokens so to solve this issue, the container settings were moved to persisting flags to the token actor. Configuring non-token actors has been disabled. Existing containers may need to be re-configured on the token post-migration.
- Fixed an issue with Firefox browsers throwing an error when using our default SVG images.  The SVG tag we were using defined the height/width using a style property, however, Firefox perfers individual height and width properties.

# Version 0.77.1 | Date: 2021-06-29

**Hot Fix**
- Corrected localization issue of text on chat cards when rolling Net Damage
- Added Zap as a rollable interface ability as it was missing from the list (Zap damage will be handled in a future release)

# Version 0.77.0 | Date: 2021-06-25

**Migration to foundry 0.8.X**
- **BREAKING:** This version of our system will not work with Foundry version 0.7.X and below. Do not update this system until you are ready to update your Foundry to version 0.8.X. And as always, **make a backup of your user data** before updating!
- Migrated the source code to work with foundry version 0.8.X
- Rewrote the migration code support new features from foundry 0.8.X

**New Features**
- Improvements have been added to the cyberware tab. For foundational cyberware that has no optional slots (such as Borgware), no Used/Total is displayed in the title.
- Added options to choose how to display the skill values for the mook character sheet. Now one can show it in the same way as it is printed in the book. Please look at the settings for this.
- Improved Ledger functionality of the Eurobucks/wealth and Improvement Points of characters
  - A new display of the ledger of both of these properties, to show all transactions done in the past, is now available.
  - Modification now gives the possibility to give a reason for the change and it is recorded who did the change.
- Added container actor sheet, which can be used for shops, loot or storage purposes.
  - **Please note, that the players have to be owners of the container actor for full functionality.**
  - Type Shop: Items cost their configured price and can be bought by the players with the click of a button. The GM has the option to make the stock of the shop be infinite or not. If it is not infinite the item will be removed after purchase.
  - Type Loot: Items are free to take and will be removed after taking them.
  - Type Stash: In addition to the same functionality as "Loot", the players can also modify the contents of the container, e.g. to use it as a group stash.
  - Type Custom: The GM has the option to specify the settings as desired.
    - Are all items free? - Makes taking an item from the container not cost anything. (On for Loot and Stash, Off for Shop)
    - Infinite Stock? - Items are not removed from the container after purchasing/taking them. (Off for Loot and Stash, GM can decide in case of Shop)
    - Players can create items? - Allows to add new items with the plus sign in the header of each category for the players. Also allows players to drag items into the container. (On for Stash, else Off)
    - Players can delete items? - Allows players to delete items with the trash can symbol. (On for Stahl, else Off)
    - Players can modify items? - Allows modification of the items. If enabled the item sheets render in an editable way, otherwise they render in a non-editable way. (On for Stash, else Off)
  - Players are not allowed to drag an item out of the container actor to their character sheet. This is only enabled for the GM, as otherwise the players could "steal" items from the container. Players have to use the take/purchase button for that.
  - **KNOWN ISSUE:** Currently, there is a [bug](https://gitlab.com/JasonAlanTerry/fvtt-cyberpunk-red-core/-/issues/261) affecting unlinked container actors therefore we recommend to workaround this bug, when you create a new container actor, change the Prototype Token to Link Actor Data.  This bug will be addressed in a future release.
- We now support an Italian translation! (thank you Misthero!)
- Netrunning Initial Implementation
  - Introduction of the Item Object: Cyberdeck
    - Migration code added for existing "Gear" items which have the word "cyberdeck" in the name. These items will be pre-pended with a '[MIGRATED]' tag on it to help identify that the item should be replaced with a new Cyberdeck Item. We have opted to not automate this replacement as people may update just prior to hosting a game and this would/could cause issues for planned sessions.
    - Cyberdeck items in the Shipped Gear Compendium have been replaced with versions utilizing the new Cyberdeck Item Object
  - Ability to equip one (1) Cyberdeck enables Meat/Net toggle on Fight Tab
  - Ability to install Programs on the Cyberdeck from the Cyberdeck Settings Page and directly from the Gear Tab
  - Programs (Booster) have been enhanced to allow the addition of Roll Modifiers for Interface Abilities (i.e. Eraser gives a +2 to Cloak)
  - Booster Roll Modifiers exposed in Roll verification dialog and added to the roll for Rezzed Boosters Only
    - Shipped Program Compendium updated to include these roll modifiers (Any imported items should be re-imported or manually updated to add these)
  - Programs (Attacker) have been enhanced to allow the setting of Damage. For Anti-Program Attackers, both BlackICE and non-BlackICE damage rolls may be configured
    -  Attack rolls for Anti-Program Attack Rolls will prompt on which damage type to roll
  - When equipping a Cyberdeck in inventory, the Fight Tab exposes a toggle between Meat and Net space. Net space enables quick access to:
    - Roll Interface Abilities
    - Roll Speed against a Black-ICE encounter
    - Roll Defense against a Net Attack
      - Includes any Rezzed Boosters that may have a DEF rating in the Modifiers field
    - Activate/Deactivate & track Rezzed Boosters, Defenders & Black ICE
      - Ability to manage (reduce & reset) the REZ on Boosters and Defenders programs when they take an attack
      - Capability to install a Booster twice to a Cyberdeck (requires 2 of the same program item in inventory) and REZ both thereby stacking their bonus modifiers per discussion with RTG on Discord
  - Deletion of the Cyberdeck Item will auto-return all programs to Actors inventory
  - Black ICE changes/enhancements
    - Black ICE Program type added
    - The ability to REZ a Black ICE Program on the Cyberdeck will create a Black ICE Actor next to the Token performing the REZ
      - **NOTE: In order for Players to REZ Black ICE Actors, they will need Foundry Permissions to create actors and tokens in the World otherwise the GM will need to REZ/deREZ the Black ICE for the players.**
    - Rezzing a Black ICE Program will:
      - Try to find a Black ICE Actor of the same name
      - If a Black ICE Actor is not found:
        - Look for an Actor folder called "CPR Autogenerated" and if it does not exist, create it
        - Create a Black ICE Actor of the same name as the Black ICE Program in the Actor Folder "CPR Autogenerated"
        - Configure the new Black ICE Actor according to the specs stored on the Black ICE Program
      - Place a Token on the Active Scene with unlinked Actor Data to the previously mentioned Black ICE Actor
      - Token Actor Data is updated with the numbers from the Black ICE Program regardless if it is a new Actor or not
    - Deleting or de-rezzing a Black ICE on a Cyberdeck will delete the Token from the scene
    - Black ICE Rez numbers are synchronized between the Cyberdeck Rezzed section and the associated Black ICE Token
    - GM Only Enhancement: When using the "Character Sheet" Sheet for Mooks, GM's have added functionality in the Rezzed Section:
      - Ability to execute Black ICE attack, damage and defense rolls
      - Ability to decrement REZ
    - Black ICE Actors unassociated with a Netrunner have had functionality added to them to quickly configure them using Black ICE Program Items
      - If a player opts to do this configuration, it further enables the ability to roll Damage from the Black ICE Actor
        - In a later release, we may decouple this and allow the ability to configure damage right on the Black ICE Actor
  - Cyberdeck Loading Requirement
    - Actors must own the Cyberdeck + Programs to install onto the Cyberdeck. ie inability to pre-load the Cyberdeck with programs before adding to an Actor. This is due to the direct relationship of the Program Items and the Cyberdeck.
  - Netrunning TODO
    - Booster Speed is not taken into account for Foundry Initiative rolls.
  - Netrunning icons for actors (and some other things) are now included in the system. They can be accessed from the tile browser in "systems/cyberpunk-red-core/icons/netrunning". Big big thanks to Verasunrise (the artist) and Hyriu33 for letting us provide this awesome artwork with our system!
- Street Drugs have been added to the "Gear" compendium.

**Changes**
- Restructured the code for character and mook sheets for ease of development
- Changed the scene activation when generating a scene from a net architecture to just viewing the scene. This allows to show the new scene to the GM, but not the players in order to do some more preparation if needed.
- Fixed various formatting issues on the mook sheet - i.e. whitespace trimmed; trailing commas and erroneous parentheses removed for Skills, Cyberware/Gear, Programs, and Critical Injuries lists.
- Added icon artwork for many of the items in the shipped Weapons Compendium.  Artwork provided by [Flintwyrm](https://twitter.com/Flintwyrm).
- Renamed some compendia to make it more clear which are necessary to import and which should not be imported.
- Default images added for compendia. Images from https://game-icons.net. They can be accessed from the file browser in "systems/cyberpunk-red-core/icons/compendium/default".
- The French translation has been updated to account for all strings in this release. (Thank you VinceKun!)

**Bug Fixes**
- Borgware items (Shoulder Mount / Implanted Frames / MultiOptic Mount / Shoulder Array) are now classified as foundational cyberware and do not require a missing foundational item.
- Code added so New Worlds will not immediately go through migration
- Fixed warning when the medtech would put the proper amount of points into surgery. The intention is, that per time you choose the surgery skill you should add two points there.
- Fixed #226 - Lock Pick is now "Lock Picking Set". Meat arms and legs now exist and operate correctly with standard hands, feet and usable accessories.
- Fixed #232 - Cancelling dialog boxes no longer creates errors in dev log
- Fixed #234 - Attempting to install cyberware, where there is no suitable foundation no longer throws an error in the console.
- Fixed Issue, with netrunning tile naming case. This caused tiles to not be displayed on linux systems.

# Version: 0.76.2 |  Date:  2021-05-28

**Hot Fix**
- Non owned actor sheets (Limited and Observer permissions) render again, the content is also shown now.
- Borgware items are now configured correctly as foundational in compendium.
- Borgware no longer displays "0/0 Optional slots" when installed on character sheet.
- Observer/limited view permissions for character sheets now work correctly.
- Core skills/cyberware now cannot be added to unlinked tokens.
- Auto-install cyberware prompt now correctly shows based on sheet type rather than actor type.
- Auto-install cyberware prompt for mook sheets now only displays to the user who initiated the prompt.
- Internal, external, and fashionware cyberware now display correctly on mook sheets.
- Deleting/uninstalling optional cyberware from mook sheets now works correctly.
- Cleaned up of many (but not all) trailing commas in mook sheet.

# Version: 0.76.1 |  Date:  2021-05-27

**Hot Fix**
- Programs can now be displayed in gear tab and on mook sheets for easier tracking.

# Version 0.76.0 | Date: 2021-05-26

**New Features**
- FnWeather made a great video demonstrating some of the following changes which you can find here: https://www.youtube.com/watch?v=csgB6c5KhkU. Thanks to him!
- Added "Option Slots Size" for optional cyberware. This allows proper tracking of cyberware that can use no slots, or multiple slots. By default when first updating to this version all cyberware has an assumed slot size of 1. Please update your optional cyberware accordingly in line with the core rulebook.
- Added extra content to the cyberware tab to display the amount of 'used' slots for foundational cyberware.
- Added option to reroll duplicate critical injuries. There is a system setting to decide if you want to use it, with the default being off.
- Added functionality to automatically resize the character and item sheets. There is a system setting to decide if you want to use it, with the default being off.
- Added Debug Elements setting for developers.
- Added "Unarmed" weapon type with optional (on by default) automatic damage determination based on BODY.
- Added new functionality for the Net architectures.
  - It can now be configured on its item sheet, adding, removing and editing the floors.
  - If a specific black ICE is selected it is linked to the corresponding black ICE item sheet if it exists. You have to create these black ICE items yourself.
  - In addition one can automatically generate a scene showing the NET architecture. This scene generation allows for floors up to eight (8) deep and up to four (4) branches to be displayed.
  - Experimental: The scene generation can be customized to use custom assets and custom sizes to allow for maximum flexibility.
  - As these new features of the Net architecture are experimental, there might be some problems or bugs. If you find any, please let us know.
- Two built-in scenes (maps) are now available in the compendium, alongside the NET architecture tiles. These have been graciously provided by [SolutionMaps](https://www.patreon.com/solutionmaps).
- The system compendium has now been updated to include ammo, armor, additional cyberware, gear, programs, vehicles and weapons. Simple descriptions are provided to align with the R. Talsorian "Homebrew Content Policy". Please ensure you always reference an official, legally-owned rulebook for the full item description and information. No Actors or "Black ICE" programs are provided, as these count as NPCs under the policy rules and cannot be distributed. If you find any mistakes or typos in the compendia, please let us know in issue #226.
- One can now change item-amount from character sheet for Ammo, Clothing, and Gear item-types.
- If an item has a source set, it now displays in the header of the item sheet.
- Armor SP can now be displayed in resource bars! Select the Star Icon next to equipped armor to make that armor active. Then, set the token up to display the resource(s) named externalData.currentArmorHead, externalData.currentArmorBody, and/or externalData.currentArmorShield.
- Mook sheet improvements
  - Cyberware can be dragged on the sheet and it will automatically be installed.
  - The automatic calculations for hp, humanity, and emp has been disabled.
  - Mook names can be changed on the sheet.
  - The ruler glyph for calculating range DVs has been added.
  - Custom skills work as designed and can be edited.
  - Critical injuries added (same as character sheets).
  - Fixed an alignment issue on weapon section.
  - A notes section has been added for free-form text about the mook.
  - All gear and cyberware can be removed by hovering over and pressing DEL. The tooltips reflect this.
  - Skills can be reset to 0 using the DEL key in the same manner as deleting items.
  - The suppressive fire option is now considered in mook sheets (same as character sheets, see issue #195).
  - Portrait added in an expandable frame.

**Changes**
- Setting the autofire maximum multiplier on an item will now be taken into account when rolling damage for autofire damage rolls.  For weapons defined in the core rules (SMG, H. SMG & Assault Rifles) leaving this as 0 will utilize the core rule set for those items.  You can over-ride the core rules (for homebrew) by actually setting this to a non-zero amount.  If you set the multiplier in the roll dialog to a value higher than the allowable value, it will default to the maximum allowable multiplier.
- Characters are now linked to their token by default, Mooks are not.
- Hoverable input fields now remain visible if field is focused and fade out for a more visually pleasing transition from visible to not-visible. (Thanks to sdenec#3813 because I borrowed some of his code from Tidy5e Sheet to accomplish this.)
- Critical damage roll cards no longer show the bonus damage added to the total, since the bonus damage is directly applied to the hp and does not consider armor (issue #214).
- Added localization to places where it was not implemented. (!325)
- Removed "Core" tag from Critical Injury and DV compendia (which should be imported) to make them distinct from "Skills - Core" and "Cyberware - Core" (which should NOT be imported). (!379)

**Bug Fixes**
- fixed #49 - The equipped glyph now takes the same space as the other two
- fixed #158 - Stat padding fixed for LUCK and EMP, so that they have the same font size as the others
- fixed #176 - Game paused animation properly translates now
- fixed #187 - Item icons are now resizing correctly to fit into their frame
- fixed #189 - EMP stat on new mook sheet can now be modified
- fixed #192 - Fixed that double quotes in weapon names break macros
- fixed #195 - Fixed that 'Has Suppressive Fire' option didn't do anything
- fixed #198 - Removes DV display when others are measuring
- fixed #204 - Fixed IP and Eurobucks Ledger functions to work with unlinked tokens
- fixed #215 - A bug where a newly created, non-edited cyberware would vanish upon install
- fixed #221 & #222 - Correction of two critical injuries
- fixed #224 - Med Tech and Fixer role abilities should now roll correctly, as per RAW
- fixed #228 - Fixed some mook sheet weapon/armor section alignment issues
- fixed !366 - Body ablation not being shown in description tab due to typo

# Version: 0.75.4 |  Date:  2021-05-05

**Hot Fix**
- Fixed release manifest to not lock users into version 0.75.3 without possibility to update

# Version: 0.75.3 |  Date:  2021-05-02

**Hot Fix**
- Role ability settings were lost when changing other data on the sheet. [issue #203](https://gitlab.com/JasonAlanTerry/fvtt-cyberpunk-red-core/-/issues/203)

# Version: 0.74.1 |  Date:  2021-04-25

**Hot Fix**
- Macros were not working due to a change in the way rolls were handled.

# Version: 0.74.0  |  Date:  2021-04-23

**UI/UX**
- FnWeather made a great video demonstrating some of the following changes which you can find here: https://www.youtube.com/watch?v=Q8DP0qcR4AU. Thanks to him!
- Added the ability to show DV for ranged weapons when using the ruler for measurement
  - Right clicking a token, you can select a DV table to use and after setting this, any ruler measurements will show the DV along with the measured range.
  - Ranged Weapons can be also configured to use a specific DV table in the item settings. Weapons with DV Tables associated with them will have a ruler in their Fight Tab which can be clicked to set the DV Table for the associated token to quickly switch DV tables when using the Ruler Measurement Tool.
- Added a Compendium with Roll Tables for Core Ranged DV Measurements from the book also providing a page reference in the description field.  Compendium contains a "DV Generic" table that has a description explaining how to create custom DV tables and how they work with the system.
- Added a "MOD" column to the Skills section of the character sheet and as a field on the Skill Item. When skills (or attacks) are rolled, the dialog will auto-populate with the mod. Skill mods on the character sheet only show non-zero values.
- Introduced some code so that the core skills on the character sheet are localized, which will help with current and future translations.
- Added a "Clothing" item for those stylish chooms (per feature request #165).
- Localized the new item and actor drop-down menus so that they appear more professional.
- Critical Injuries are now items so that injuries can be premade, dragged to the character sheet, and used more easily in critical injury tables.
  - Even better, once you have critical injury tables, you can roll right from the character sheet and it will automatically add a randomized critical injury.
- Wound State penalties automatically apply as mods on the roll (e.g. if the token is Seriously Wounded all actions will automatically have a -2 penalty)
- You can now change the amount of ammo in a weapon's clip right from the fight tab. In addition, you can type "+X" or "-Y" (where X and Y are numbers) into the input and it will perform the math.
- Mook sheet introduced. Please use [issue #181](https://gitlab.com/JasonAlanTerry/fvtt-cyberpunk-red-core/-/issues/181) to suggest improvements or point out rough edges.
- Added "Source" field to item sheets to keep track of where items came from (e.g. Core Rules Pg. 351)
- "Thrown Weapon" is now a weapon type and "Athletics" is now a weapon skill for throwing grenades, etc. Weapons that use the athletics skill also use DEX as the stat, which is consistent with the rules.
- Weapon section of the Fight Tab has been slightly redesigned.
- Shields have been implemented (they are an armor type item).
- Added the ammunition type to the attack and damage roll cards.
- Added "N/A" as a choice for cyberware install location.
- New beautiful artwork for the d6s and d10s (thank you to Flintwyrm!)
- Cleaned up display of chat cards. Most of the data is now by-default hidden and can be opened by clicking on the roll total.
- Rolls now indicate if they are whispered, blind, or self.
- Can now roll damage from the chat card for attack rolls.
- Added ability to unload a weapon.
- Added a field for a static attack modifier on weapons.
- Added a warning on cyberware install to remind users that installing cyberware also deducts from maximum humanity.

**Bug Fixes**
- 'Basic' skills (the ones that all characters have points in) now display as bold again (no issue to reference)
- Token name now correctly displays in chat when rolling from a macro.
- Fixed a bug which caused unlinked tokens to erroneously pull certain data from the parent actor.
- Fixed a bug which caused collapsed gear categories to not retain their state upon character sheet update.

**Plumbing**
- Refactored data model to conform with plans going forward.
- Logging has been overhauled.

# Version: 0.66  (Hotfix) |  Date:  2021-03-21

**Hot Fix**
- Aimed shot was using the Autofire Skill when attacking instead of using the Weapon Skill
- Suppressive Fire was using the Weapon Skill when attacking instead of using the Autofire Skill

# Version: 0.65  |  Date:  2021-03-20

**UI/UX**
- Implemented a chat command “/red” which will roll 1d10 and explode on a 10 or negatively explode (implode?) on a 1. Rolls of the form “/red+X”, “/red-X”, and “/red XdY” are also supported (though there are no dice icons if Y isn’t a 6 or a 10).
- Macros can now be made for weapons, skills, journal entries and actors by dragging and dropping to the macro bar. Weapon macros can be easily edited to roll for damage, aimed shots, autofire, and suppressive fire.
- Improvement Points now trackable and exist on the front of the character sheet, underneath Humanity.
- Eurobucks tracked in the gear tab.
- Can now view details of installed cyberware in ‘read-only’ mode.
- Being able to edit installed cyberware causes issues so the original fix was to make it so that installed cyberware could not be edited. This had the unintended consequence that you could no longer click on the item to see its description if you wanted to reference how it worked. This solves that issue.
- System setting to allow skipping of the roll dialogue. This basically inverts the function of ctrl-click. This rolls default values on a regular click and brings up the roll modification dialogue on ctrl-click.
- Early implementation for keeping track of critical injuries.
- New glyphs/buttons for autofire and suppressive fire.
- Death saves are now rollable, trackable, and relate to critical injuries.
- Added the option to apply no humanity loss on installation of cyberware. This is useful if the user realizes a mistake after installation. They can uninstall, edit the item and reinstall without having to worry about fixing humanity loss afterwards. Also useful for reinstallation of items like Skill Chips and extra cyberarms for the quick-change mounts.
- Added support for damage formulas like 2d6+2, 3d6-4, etc. for all your homebrew and 2020 conversions.
- Ctrl-click an item name to send its description to chat. This feature is still in the early stages of development and may have some formatting issues on the chat card. These will be addressed as the feature is refined.
- Rolling for cyberware is now printed to chat.
- Items of type ‘gear’ are now equippable (just a cosmetic feature for keeping track of what is on your person vs. somewhere else).
- Improved alignment when there are multiple Roles selected to display.

**Plumbing:**
- All rolls moved off of the character sheet to allow for drag n’ drop macros.
- Foundation for roll glyphs embedded into chat cards implemented.
- Many changes and fixes for data migration during updates.

**Bug Fixes:**
- Applying status condition icons no longer fails.
- Custom pause animation no longer disappears on unpause/re-pause.
- Collapsing the side bar now works as expected.
- Rolls are now displayed as originating from the selected token, rather than the player. If no token is selected or associated with the actor sheet, rolls are displayed from the actor that triggered the roll.
- Fixed alt-text localization for critical injuries section.
- When changing the ammo types on an owned weapon, a race condition was occurring which was intermittently over-writing what the proper value of ammoVariety should be so setting compatible ammo would sometimes just fail. Re-ordered the way things are done and this has resolved this issue.
- Vehicles now correctly display Structural Damage Points (SDP) instead of the erroneous spd.
- Fix for the inability to set compatible ammo for an unowned weapon.
- Fixed a bug where choosing to roll for humanity loss when installing cyberware wouldn’t work.
- Fix for humanity loss looping back and subtracting from the maximum when dropping below 0 upon cyberware installation.
- There was an issue where if you made any change to the character sheet, it would reset the view of the sheet. For example, if you opened the sheet and collapsed category 1, Closed the sheet, Opened the sheet, Category 1 is still collapsed. All Good. Change anything (Pin something, change a skill level) Category 1 would instantly expand.
- Fixed a bug where wound state was not updating properly on some actors.
