# Panels App - A visual toy

This document describes the Panels App product, a web-based frontend-only app.

Panels App is an "interface toy" inspired in sci-fi and retro-sci-fi control panels. It will generate pseudo-random interfaces by arranging different types of "panels" on screen, on pseudo-random layouts. The shape and contents of each layout is preserved in URL state, so users can recreate it later.

The Panels App UI completely fills the browser screen with a "board" made up of frames and panels. The UI and all of its contents should adapt their shape when the window is resized.

## Concepts
### Frames and frame levels
A screen division. It either contains other frames ("node frame"), or a panel ("leaf frame").

The root frame, which always exists and includes the whole UI, is at level 0. "Child" frames directly within it will be at level 1. Children of level 1 frames are at level 2, and so on. The maximum level is configurable, and is by default 4.

Frames do not need to be at level 4 to become leaf frames. Frames at any level can become leaf frames.

#### Frame division types
Node frames will always contain children. The way this happens is determined at frame creation time.

Frame divisions (to create the next level frames) will always happen in a grid. The grid will contain between one and six columns and between one and four rows. There must be at least two cells in the grid. All cells in the same grid will have the same shape and size. The grid occupies 100% of the space of its frame.

Frame divisions have an order: from left to right and from top to bottom. This order must be respected when reading their contents for state serialization, as well as for creation. For example, for a grid with two rows and three columns, the order must be

1  2  3
4  5  6

### Panel
A part of an interface. It visually represents a sci-fi interface. It needs to be contained in a "leaf" frame, and it completely fills the frame.

Panels will, by default, be affected by a "global registry". Each panel can decide how the registry values affect their UI (or not).

Some panels will accept user input; these can affect the global registry values.

### Global state and the global registry
State will be managed at the app level. All panels can have access to all variables.

At the global level, six variables will be used as "global registry". These will contain numbers from 0 to 255.
All panels can read the state of the global registry by default.

### Tick (internal clock)
The "tick" concept comes from games. Every few milliseconds a tick happens; this is an event.

On each tick, the global registry values can change. How they change is subject to algorithms. For v0 this will just be random.

The tick value always increments from 0 to 65535, then it wraps to 0 again.

The tick value can be read by all panels.

### More on panels
#### Panel state
Panels, by default will not have their own state, but rather be governed by global values. This makes it possible to easily synchronize outputs of unrelated panels.

Some panels may choose to have their own state.

All panels should have one or more output states, meant to represent the values in the global registry.

#### Panel subtypes
Some panel have subtypes: they look slightly different but have the same functionality and state. 
For any panel type with subtypes, the subtype will be a value from 0 to 255.

Not all themes support all subtypes. When a theme does not support a subtype, the actual rendered subtype is determined by round-robin between the available digits. Example for a theme that only supports subtypes 0, 1, and 2:

Requested type | Rendered type
------------------------------
0   | 0
1   | 1
2   | 2
3   | 0
4   | 1
5   | 2
6   | 0
7   | 1
8   | 2
...
and so on.

#### Initial panel types
##### Blank
It represents an empty panel. It has no interactivity or controls.

##### LED
It represents a round LED light.

**UI**: A round light in the middle of the panel. It may have Unicode text on it, randomly chosen at panel instantiation time. The user can configure the text. The text can appear either above the light or below it. 

**State**: The light can be either on or off. If off, the led is black. If on, it can be one, two, three, or four "theme colors", chosen from within the eight theme-defined colors (so we only need the index number to represent them). Examples: [0, 2, 3, 5] means an "on" LED can be in colors 0, 2, 3, or 5 of the current theme; [1] means the LED can only be on with color 1 of the palette. These values are chosen at panel instantiation.

LEDs can be "regular" or "rhythmic".

For regular LEDs, on or off state (and chosen color) is determined by the value of one of the global registry values; which one (from 0 to 5) is determined at panel instantiation. Each LED color should have roughly the same probabilty to appear.

Rhythmic LEDs determine being on or off on a blink pattern. The pattern is set by an internal cycle set by the tick value; this cycle is made up of 8 ticks and it repeats, and the LED will be on or off depending on the step of each cycle (example: 10011010, meaning the led is "on" during steps 0, 3, 4, and 7). By default, the probability of a led not blinking (eg. its state is not defined by a blinking cycle) is 50%; this probability is configurable.

**Grouping**: If a LED is instantiated within a grid, the probability of its siblings in the same grid to also become LEDs should be slightly higher.


##### Button
It represents a button that can be physically depressed to represent an "on" state.
**UI**: A round, square, or rectangular button in the center of the panel. It may have Unicode text on it, randomly chosen at panel instantiation time. The user can configure the text. The text can appear either inside the button, above it, or below it. 
Buttons can be opaque or semi-transparent.
**State**: The text on the button is globally stored.
The button can be off (not depressed) or on (depressed). Semi-transparent buttons can light up when on. Light color is always the same, taken from the theme colors.

##### Flick switch
It represents a kind of user-operated switch, with two opposing positions.
**UI**: The switch can be vertical or horizontal. When vertical, the "up" position means "on" and the "down" position means "off".
When horizontal, the "right" position means "on" and the "left" position means "off".
In the default "metallic" theme, it should look like a small, rounded chrome stick that is coming out of a chrome circle.
It can have text on top or bottom.
**State**: On/off. State is only changed by user intervention.

##### Bar Meter
It represents a digital or analogue bar or box, much longer in a dimension than the other, to display values within a range, plus an internal indicator of the current value. Physical examples are: a thermometer, an old-timey radio tuning indicator, or the "channel volume" display in a sound mixer.
A bar meter slightly increases the chance for its siblings to also be bar meters. This influence increases when the frame level is higher. 
**UI**: The "measure box" can be horizontal or vertical. It should be crossed by small "value bars" to represent possible values. Bars can be inside or outside the measure box. When vertical, 0 is at the bottom end; when horizontal, 0 is at the left end. Minimum and maximum values represented are configurable; by default they are 0 and 65000 respectively. They must be integer values within the valid value range of a Javascript Number type.
Also configurable is the step between bars. By default the step is 5000. What this means is: the first small bar after 0 represents a value of 5000, the next one represents 10000, and so on.  
The indicator should appear to be inside the measure box, and can have one of two styles: "fill" (the bar fills the space from the 0 value to the current value) or "stick" (there is a single bar sitting at the space representing the current value).
When there is a change in value, there could be an animated delay - for example, to represent a physical liquid going up or down due to pressure changes. The delay can be 0 when we represent digital displays. The animation delay is configurable.

Bar meters have two subtypes.

In the default "metallic" theme, the subtypes are represented as follows:

- Subtype 0: Thermometer. The "measure box" appears to be hollow, tubular, cylindrical, and encrusted within the panel. It appears to be covered by a clear pane. Value bars appear to be painted on the tube and are very dark in colour, but thin. The indicator is solid in color, fill style, and there is some spacing between the sides of the measure box and the sides of the indicator. Delay is long.
- Subtype 1: Radio. The "measure box" is also hollow, tubular, but square-ish.  Value bars appear to be painted on the tube and are very dark in colour, but thin. The indicator is stick-type: a thin red bar coming up from one of the sides of the measure box, but not completely stretching to the other side. Delay is short.
All bar meters can have also some text attached; text can be on top or on bottom, but not at the center.

**State**: Bar meters represent values coming from global registry. How it is calculated is determined at initialization time and is configurable. The calculation can be:
- The direct value of any of the registry variables, or
- An addition, subtraction, multiplication, division, or modulo operation between the values of two registry variables.
Results are always integer. If a result is not integer, it will be rounded.

##### Special panel instances
Some panels will have special behaviors depending on their text. The system nust keep track of these rules and apply them to any panel that becomes a special panel.

This can happen in one of two ways:
- The system determines it at initialization. Whenever a panel is created, it has a configurable 10% chance to become a special panel.
- The user changes the text of the panel to match one of the triggering texts.

A special panel can also be stripped of its "specialness" by changing its text to a non-trigger text.

###### "Power" buttons and switches
This applies to any panel with user inputs and two states (such as buttons and switches).
If the panel has any of the following case-insensitive names:
- On
- Off
- On/Off
- Power
then it's a "power" panel.

Power panels have an effect on their siblings and all of their siblings' children: 
- If they are off, the siblings are forced to be "powered off", meaning they will be shown in the off position regardless of their internal state. 
- If they are on, the siblings are allowed to function normally.

Power panels, when created by the system, are always instantiated in the "on" position.

Two or more power panels that influence a third panel's state will apply on an "or" condition for the power panel values. That is: if power panel A and power panel B affect panel C, panel C will be "powered off" if ether A or B are off, or if both are off. 

### Theme
The theme will determine the appearance of all UI.
Themes have a default representation that is internally stored in the app. In time we will allow the users to change parts of it.

Themes will also decide up to eight "theme colors" that are shared by the panels. Whenever a panel uses a color to represent a state (such as a led lighting up or a button being pressed) it uses one of these colors.
- One of these colors is a "warning" color.
- One of these colors is a "danger" color.
- One of these colors is a positive color.
The rest of the colors do not have a defined meaning.

The only theme for now will be "metallic". This is as follows:
- Panels will have a metallic appearance with some reflections, similar to a polished steel plate.
- UI is skeuomorphic, representing real-life items. Buttons look like 3D buttons. Leds look like small bulbs, with a depression around them.

Theme information will be stored in a JSON object internal to the app. In the future we might decide to allow users to define their own objects in this way.

### Context menu and User configuration
The user can do a right click on the interface to display a context menu on that place. The system must register which panel the user clicked on.
The context menu will contain the following options:
- "Configure...": This will open another popup to configure the panel the user clicked on. Options on the popup depend on the panel type.
- "Change theme...": This open a selector for themes.
- "Change theme colors...": This opens a selector for colors for the current theme. It should display each of the eight colors and allow the user to change each one via color dropdown UI.
- "New random board": Scraps the current board and creates a new one with random parameters.
- "New board with parameters...": Displays a popup with controls to edit values that influence the creation of new boards, then creates a new board.

### Board configuration state
This is the internal representation for the tree of frames and panels. It is created at app load.


## How the system works
On load, the system makes a new board: First, it checks if there is URL state. If so, it attempts to load it. If not, it will create a new board configuration state, create the corresponding frames and panels, and then update the URL with the serialized representation of the configuration state.

### How the configuration state is created
On instantiation, each frame is randomly assigned to be either a leaf frame or a node frame. The closer the frame level of the current level is to the maximum depth, the bigger the probability is to become a leaf frame. The root frame (level 0) is always a node frame.

For node frames, the number of columns and rows of their internal grid is also randomly decided. The numbers of rows and columns have a bigger probability of being smaller the larger the current level is.

Each cell of the grid now becomes a new frame in the next level, occupying 100% of the space of the cell, and the frame instantiation process happens for these new frames too.

For leaf frames, a type of panel is chosen at random. Some panels influence the probability of "sibling" panels to be (or not be) a particular kind of panel, in which case these rules should be observed.

### Variables that affect board creation
- Theme: Select from available options. For now, only "metallic" is available.
- Colors: The 8 theme colors can be chosen; the defaults for the theme are displayed.
- Maximum depth: between 1 and 6.
- Blink probability: The probability that a panel is blinking. 50% by default.
- Grid size: How many rows and columns minimum and maximum can a node frame's grid have.


## State serialization
It's important that the state of the app is faithfully represented in the URL, and that the URL is as compact as possible.

The URL-serialized object will be composed of two parts:
- Serialized board configuration state, including config parameters for panels when not following standard values
- Serialized board creation variables: theme and colors only

### Serializing the board configuration state
The board configuration state is a tree. To serialize it, it could be traversed in a BFS fashion.

Each panel level is represented as a string composed as follows:
L{n}{node string}{node string}

where {n} is the level number, from 0 to the max allowed.

Node string: Represents a frame or panel. It is represented as a string composed as follows:

{Serialization ID}{Local configuration settings}-

where {Serialization ID} is a code representing this type of node, and {Local configuration settings} serialize initialization options (either randomly chosen by the system, or as a result of user config) for this node. The character "-" is used as a delimiter between node strings.

Serialization IDs and config settings per node type are as follows. Note that "!" is used as a delimiter between config setting values. 

---------------------------------------------------------------------------------------------------------
Node type       | Serialization ID  | Config settings                       | Example string            |
---------------------------------------------------------------------------------------------------------
Node frame      | F                 | {number of columns}!{number of rows}  | F2!5                      |
Blank           | X                 |                                       | X                         |
Blinking LED    | K                 | {colors}!{blink pattern}!{text}!{text position (t for top, b for bottom, or c for center)} | K0345!01101001!Hi!t |
Regular LED     | D                 | {colors}!{registry index it listens to}!{text}!{text position (t for top, b for bottom, or c for center)} | D012!2!OK!b |
Button          | B                 | {o for opaque, or t for semi-transparent}!{color it lights up in, or x if none}!{text}!{text position (t for top or b for bottom)}   | Bt!2!hi!b  |
Power Button    | BP                 | {o for opaque, or t for semi-transparent}!{color it lights up in, or x if none}!{text}!{text position (t for top or b for bottom)}   | BPt!2!hi!b  |

Flick switch    | S                 |                                       | S                         |
Power flick switch    | SP          |                                       | SP                        |
Bar Meter       | M                 | {subtype}!{first state registry number}{operator, if any}{second state registry number, if any}
---------------------------------------------------------------------------------------------------------

Note that leaf frames are not represented by themselves; only the panel they contain is represented.