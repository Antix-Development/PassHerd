# PassHerd

A basic portable password manager for Windows.

## Why

Way back in 2009 I was using a password manager called KeePass. One day it just decided to corrupt my password database and when I contacted the company they just said *"Yeah, that happens sometimes"*.

After I got un-angry about the KeePass *fob off*, I cobbled together my own password manager in Visual Basic, an application I've used until this very day.

Since a basic password manager is a fairly simple application to write, I decided to create a successor using [WebPlus](https://github.com/Antix-Development/WebPlus), a framework, which leverages WebView2 to transform web applications into desktop applications.

And here it is, PassHerd.

## How

On first launch, PassHerd will ask you to enter and confirm a master password. This password will be used when encrypting and decrypting your passwords file, and is the only password you really need to remember.

Once you arrive at the main interface, the process of adding, and manipulating passwords should be fairly intuitive.

The widow is divided into 3 sections.. the toolbar at the top, the password list on the left, and the password details on the right.

### Toolbar

#### Add New Password

&emsp;Add a new blank password. Passwords are are automatically sorted in A to Z order. Hotkey is "Control + n".

#### Save Passwords

&emsp;Save the password database. Hotkey is "Control + s".

#### Delete Password

&emsp;Delete the currently selected password. Note that this operation CANNOT be undone! Hotkey is "Delete".

#### Set Master Password

&emsp;Change the master password.

#### Import CSV file.

&emsp;Import passwords from a CSV (Comma Separated Values) file. CSV format is title, program/website, email address, password, notes.

#### Export CSV file.

&emsp;Export all passwords to a CSV file. CSV format is title, program/website, email address, password, notes.

#### Cycle Font Size

&emsp;Cycles through the three font sizes.

&emsp;The ***passherd.json*** file contains the font sizes and can be edited in a text editor. Note that 1rem equals 10 pixels.

#### Toggle Theme

&emsp;Toggle between light and dark color themes.

&emsp;The ***passherd.json*** file contains the color themes and can be edited in a text editor.

#### GitHub

&emsp;Visit the Passherd repository on GitHub.

## Thanks

If you end up using PassHerd maybe you'd consider [buying me a coffee](https://www.buymeacoffee.com/antixdevelu) :coffee: