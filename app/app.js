/**
 * PassHerd.
 * A basic portable password manager for Windows.
 * @copyright (c) 2023 Cliff Earl, Antix Development.
 * @license MIT
 * @namespace PassHerd
*/

'use_strict';

let 

uid = 0,

options, 
optionsChanged = false,

masterPasswordCache,
masterPasswordConfirmationRequired = false,

passwordFile,
passwordsFileChanged = false,

selectedItem,
passwordTitleChanged,

notificationID = null,

resizing,
newX;

const 

OPTIONS_FILENAME = 'passherd.json',
PASSWORDS_FILENAME = 'passwords.pwf',

log = t => console.log(t), // Dump the given text to the devtools console.
getByID = id => document.getElementById(id), // Get the HTML element with the given id.
showElement = (el, show = true) => (show) ? el.classList.remove('hidden') : el.classList.add('hidden'),
isHidden = el => el.classList.contains('hidden'),
clamp = (v, min, max) => (v < min ? min : v > max ? max : v), // Constrain the given value to lie within the given range.

dialogScreen = getByID('dialog_screen'),
dialogTitle = getByID('dialog_title'),
dialogBody = getByID('dialog_body'),
dialogConfirmButton = getByID('dialog_confirm_button'),
dialogCancelButton = getByID('dialog_cancel_button'),

masterPasswordScreen = getByID('master_password_screen'),
masterPasswordInput = getByID('master_password_input'),
masterPasswordConfirmInput = getByID('master_password_confirm_input'),
masterPasswordConfirmLabel = getByID('master_password_confirm_label'),
masterPasswordMismatchLabel = getByID('password_mismatch_label'),
masterPasswordconfirmButton = getByID('master_password_confirm_button'),

useDarkThemeButton = getByID('use_dark_theme_button'),
useLightThemeButton = getByID('use_light_theme_button'),

containerView = getByID('container'),
listView = getByID('listview'),
detailsView = getByID('detailsview'),
resizeBar = getByID('resizebar'),

passwordList = getByID('password_list'),

passwordTitleInput = getByID('password_title'),
passwordURLInput = getByID('password_url'),
openPasswordURLButton = getByID('open_password_url_button'),
passwordVisibilityButton = getByID('toggle_password_visibility_button'),
userNameInput = getByID('password_username'),
emailAddressInput = getByID('password_email'),
passwordPasswordInput = getByID('password_password'),
passwordNotesInput = getByID('password_notes'),

copyContextMenu = getByID('copy_context_menu'),
userHistoryContextMenu = getByID('username_history_context_menu'),
emailHistoryContextMenu = getByID('email_history_context_menu'),

addPasswordButton = getByID('add_password_button'),

addPassword = () => {
	createNewPasswordFile();
	
	let password ={
		uid: 0,
		title: '',
		url: '',
		user: '',
		email: '',
		pass: '',
		notes: ''
	};
	passwordFile.passwords.push(password);
	createPassword(password, true);
	passwordsFileChanged = true;
},

setFontSize = () => setRootVariable({name: '--font-size', value: `${options.fontSizes[options.fontSize]}rem`}),

// Hide any currently open context menu.
hideContextMenus = () => {
	showElement(emailHistoryContextMenu, false);
	showElement(userHistoryContextMenu, false);
	showElement(copyContextMenu, false);
},

notificationContainer = getByID('notification'),
notificationBody = getByID('notification_body'),

// Display a notification.
notify = (text, type = 0) => {

	notificationBody.innerHTML = text;

	notificationBody.classList.remove('error');
	if (type === 1) notificationBody.classList.add('error');

	clearTimeout(notificationID);

	notificationID = setTimeout(() => {
		showElement(notificationContainer, false);

	}, 3000);

	showElement(notificationContainer);
},

// Display a confirmation dialog using the given options.
confirmationDialog = (options) => {
	const o = Object.assign({
		title: 'Confirmation Required',
		body: 'Are you sure you want to continue?',
		confirm: 'Yes',
		cancel: 'No',
		onConfirm: () => {},
		onCancel: () => {},
	}, options);

	dialogTitle.innerHTML = o.title;
	dialogBody.innerHTML = o.body;

	dialogConfirmButton.textContent = o.confirm;
	dialogConfirmButton.onclick = o.onConfirm;

	dialogCancelButton.textContent = o.cancel;
	dialogCancelButton.onclick = o.onCancel;

	showElement(dialogScreen);
},

// Save options.
saveOptions = () => {
	if (optionsChanged) {
		wp.saveTextFile(JSON.stringify(options, null, 2), `${WP_PATH}${OPTIONS_FILENAME}`); // Options are saved in "pretty" mode to make manual editing easier.
		optionsChanged = false;
	}
},

// Create new password file.
createNewPasswordFile = () => {
	if (!passwordFile) {
		passwordFile = {
			passwords: [],
			userHistory: [],
			emailHistory: [],
		}
		passwordsFileChanged = true;
	}
},

// Persist the passwords file to storage.
savePasswords = async () => {

	createNewPasswordFile();

	if (passwordsFileChanged) {

		const encryptedFile = await encrypt(JSON.stringify(passwordFile), masterPasswordInput.value);

		if (encryptedFile) {
			wp.saveTextFile(encryptedFile, `${WP_PATH}${PASSWORDS_FILENAME}`);

		} else {
			console.error('failed to encrypt file.');
		}

		passwordsFileChanged = false;

	}
},

// Load passwords file.
loadPasswords = async () => {

	if (passwordFile) {
		passwordFile = await decrypt(passwordFile, masterPasswordInput.value); // Attempt to decrypt the file using the supplied master password.

		if (passwordFile) {
			passwordFile = JSON.parse(passwordFile);

		} else {
			console.error('failed to decrypt file.');

			wp.exit();
		}

	} else { // Create new new passwords file.
		createNewPasswordFile();

	}
	
	for (let i = 0; i < passwordFile.passwords.length; i++) createPassword(passwordFile.passwords[i], false);

	reorderPasswords();
	
	showElement(masterPasswordScreen, false);

	activateFirstPassword();
},

// Delete the selected password.
deletePassword = () => {
	if (selectedItem) {

		for (let i = 0; i < passwordFile.passwords.length; i++) {
			if (passwordFile.passwords[i].uid === selectedItem.id * 1) {
				passwordFile.passwords.splice(i, 1);
			}
		}

		passwordTitleInput.disabled = true;
		passwordURLInput.disabled = true;
		openPasswordURLButton.disabled = true;
		userNameInput.disabled = true;
		emailAddressInput.disabled = true;
		passwordPasswordInput.disabled = true;
		passwordVisibilityButton.disabled = true;
		passwordNotesInput.disabled = true;
		
		passwordTitleInput.value = '';
		passwordURLInput.value = '';
		userNameInput.value = '';
		emailAddressInput.value = '';
		passwordPasswordInput.value = '';
		passwordNotesInput.value = '';

		let autoSelectItem = selectedItem.nextElementSibling || selectedItem.previousElementSibling;

		passwordList.removeChild(selectedItem);
		selectedItem = null;

		if (autoSelectItem) autoSelectItem.onclick();
		selectedItem = autoSelectItem;

		passwordsFileChanged = true;
	}
},

// Get the password with the given id.
getPasswordWithID = (id) => {
	for (let i = 0; i < passwordFile.passwords.length; i++) if (passwordFile.passwords[i].uid === id * 1) return passwordFile.passwords[i];
	return null;
},

// Create new password HTML element.
createPassword = (password, activate = false) => {
	uid++;

	password.uid = uid;

	const li = document.createElement('li');

	li.id = uid;
	li.textContent = password.title;

	passwordList.prepend(li);

	li.onclick = e => {
		if (selectedItem) selectedItem.classList.toggle('selected');
		li.classList.toggle('selected');
		selectedItem = li;
		
		passwordTitleInput.value = password.title;
		passwordURLInput.value = password.url;
		userNameInput.value = password.user;
		emailAddressInput.value = password.email;
		passwordPasswordInput.value = password.pass;
		passwordNotesInput.value = password.notes;

		passwordTitleInput.disabled = false;
		passwordURLInput.disabled = false;
		openPasswordURLButton.disabled = false;
		userNameInput.disabled = false;
		emailAddressInput.disabled = false;
		passwordPasswordInput.disabled = false;
		passwordVisibilityButton.disabled = false;
		passwordNotesInput.disabled = false;

		if (activate) {
			passwordTitleInput.focus();
		} else {
			li.focus();
		}
	};

	if (activate) li.onclick();
},

// Sort`passwordList` into alphabetical order.
reorderPasswords = () => {
	const listItems = Array.from(passwordList.getElementsByTagName('li')); // Get the list items as an array.
	passwordList.innerHTML = ''; // Clear the unordered list.
	listItems.sort((a, b) => a.textContent.localeCompare(b.textContent)); // Sort the array based on the text content of each li element.
	listItems.forEach((li) => passwordList.appendChild(li)); // Append the sorted array back to the unordered list.
},

// Activate the first password if it exists.
activateFirstPassword = () => {
	if (passwordList.firstElementChild) passwordList.firstElementChild.onclick();
},

changeMasterPassword = () => {
	if (masterPasswordConfirmationRequired) {
		// Changing master password.

		if (masterPasswordInput.value === masterPasswordConfirmInput.value) {
			// Input passwords matched, close the interface.
			masterPasswordCache = null;
			passwordsFileChanged = true;

			showElement(masterPasswordMismatchLabel, false);
			showElement(masterPasswordScreen, false);

			notify('Master password changed.');

		} else {
			// Input passowrd do not match, show error message.
			showElement(masterPasswordMismatchLabel, true);

		}

	} else {
		// Not changing master password, so load passwords file.
		loadPasswords();

	}
};

// Open url/password copy context menu.
document.body.oncontextmenu = e => {
	if (e.target.parentElement === detailsView) return true;
	
	if (!isHidden(copyContextMenu) || !isHidden(userHistoryContextMenu) || !isHidden(emailHistoryContextMenu)) hideContextMenus();
	
	// Process passwords list context menu (used for copying usernames and passwords to clipboard).
	if (e.target.parentElement === passwordList) {
		if (e.target != selectedItem) {
			e.target.onclick();
			selectedItem = e.target;
		}

		const bounds = e.target.getBoundingClientRect();
		copyContextMenu.style.width = `${['25', '30', '40'][options.fontSize]}rem`;
		copyContextMenu.style.top = `${bounds.top - 4}px`;
		copyContextMenu.style.left = `${bounds.left}px`;
		
		copyContextMenu.classList.toggle('hidden');
	}
	e.preventDefault();
	return false;
}

// Fired when the whole page has loaded.
window.onload = () => {

	wp.setWindowTitle("PassHerd");

	// Set paired password title.
	passwordTitleInput.onkeyup = e => {

		if (e.key === 'Enter') {
			selectedItem.textContent = passwordTitleInput.value;
			getPasswordWithID(selectedItem.id).title = passwordTitleInput.value;
			reorderPasswords();
			selectedItem.scrollIntoView();
	

		} else {
			passwordTitleChanged = true;

		}

		passwordsFileChanged = true;
	};
	
	// Set paired password title and reorder password list.
	passwordTitleInput.onblur = (e) => {
		if (passwordTitleChanged) {
			if (selectedItem) {
				getPasswordWithID(selectedItem.id).title = passwordTitleInput.value;
				selectedItem.textContent = passwordTitleInput.value;
				reorderPasswords();
				passwordTitleChanged = false;
			}
		}
	};

	// Set paired password url.
	passwordURLInput.onblur = () => {
		if (selectedItem) {
			getPasswordWithID(selectedItem.id).url = passwordURLInput.value;
			passwordsFileChanged = true;
		}
	};
	
	// Set paired password url and display url history if required.
	userNameInput.onkeyup = e => {
		const value = userNameInput.value;

		switch (e.key) {
			case 'Escape':
				showElement(userHistoryContextMenu, false);
				break;

			case 'Enter':
				if (!passwordFile.userHistory.includes(value) && value != '') passwordFile.userHistory.push(value);
				break;

			case 'ArrowUp':
				break;

			case 'ArrowDown':
				break;

			default:
				if (passwordFile.userHistory.length > 0) {

					userHistoryContextMenu.innerHTML = '';
		
					let show = false;
			
					for (let i = 0; i < passwordFile.userHistory.length; i++) {
						const item = passwordFile.userHistory[i];
			
						if (item.indexOf(value) === 0) {
							const li = document.createElement('li');
							li.textContent = item;
							userHistoryContextMenu.appendChild(li);
							show = true;
							li.onclick = e => {
								userNameInput.value = li.textContent;
								getPasswordWithID(selectedItem.id).user = li.textContent;
							}
			
							li.onpointerenter = e => li.focus();
			
							li.tabIndex = -1;
							li.onkeyup = e => {
								if (e.key === 'Delete') {
									const parent = li.parentElement;
									parent.removeChild(li);
									if (parent.children.length === 0) showElement(parent, false);

									passwordFile.userHistory.splice(passwordFile.userHistory.indexOf(li.textContent), 1);

								}
							}
						}
					}
			
					if (show) {
						const bounds = userNameInput.getBoundingClientRect();
						userHistoryContextMenu.style.left = `${bounds.left}px`;
						userHistoryContextMenu.style.top = `${bounds.bottom}px`;
						showElement(userHistoryContextMenu, true);
			
					} else {
						showElement(userHistoryContextMenu, false);
					}
				}
				break;
		}
	}

		// Set paired password username and add username to username history array.
	userNameInput.onblur = e => {
		if (selectedItem) {
			const value = userNameInput.value;
			if (value != '' && !passwordFile.userHistory.includes(value)) passwordFile.userHistory.push(value);
			getPasswordWithID(selectedItem.id).user = value;
			passwordsFileChanged = true;
		}
	};

	// Set paired password email and display email history if required.
	emailAddressInput.onkeyup = e => {
		const value = emailAddressInput.value;

		switch (e.key) {
			case 'Escape':
				showElement(emailHistoryContextMenu, false);
				break;
		
			case 'Enter':
				if (!passwordFile.emailHistory.includes(value)) passwordFile.emailHistory.push(value);
				break;
		
			default:
				if (passwordFile.emailHistory.length > 0) {

					emailHistoryContextMenu.innerHTML = '';
					let show = false;

					for (let i = 0; i < passwordFile.emailHistory.length; i++) {
						const item = passwordFile.emailHistory[i];
						if (item.indexOf(value) === 0) {
							const li = document.createElement('li');
							li.tabIndex = -1;
							li.textContent = item;
							emailHistoryContextMenu.appendChild(li);
							show = true;
							li.onclick = e => {
								emailAddressInput.value = li.textContent;
								getPasswordWithID(selectedItem.id).email = li.textContent;
							}

							li.onpointerenter = e => li.focus();

							li.onkeyup = e => {
								if (e.key === 'Delete') {
									const parent = li.parentElement;
									parent.removeChild(li);
									if (parent.children.length === 0) parent.classList.add('hidden');
									passwordFile.emailHistory.splice(passwordFile.emailHistory.indexOf(li.textContent), 1);
								}
							}
						}
					}

					if (show) {
						const bounds = emailAddressInput.getBoundingClientRect();
						emailHistoryContextMenu.style.left = `${bounds.left}px`;
						emailHistoryContextMenu.style.top = `${bounds.bottom}px`;
						showElement(emailHistoryContextMenu);

					} else {
						showElement(emailHistoryContextMenu, false);

					}
				}
				break;
		}
	}

	// Add email to email history array.
	emailAddressInput.onblur = e => {
		if (selectedItem) {
			const value = emailAddressInput.value;
			if (value != '' && !passwordFile.emailHistory.includes(value)) passwordFile.emailHistory.push(value);
			getPasswordWithID(selectedItem.id).email = value;
			passwordsFileChanged = true;
		}
	};

	// Set paired password password.
	passwordPasswordInput.onblur = e => {
		if (selectedItem) {
			getPasswordWithID(selectedItem.id).pass = passwordPasswordInput.value;
			passwordsFileChanged = true;
		}
	};
	
	// Set paired password notes.
	passwordNotesInput.onblur = e => {
		if (selectedItem) {
			getPasswordWithID(selectedItem.id).notes = passwordNotesInput.value;
			passwordsFileChanged = true;
		}
	};

	addPasswordButton.onclick = addPassword;
	
	// Delete selected password.
	getByID('delete_password_button').onclick = () => deletePassword();

	// Save all passwords.
	getByID('save_passwords_button').onclick = async () => await savePasswords();

	// Initiate master password change.
	getByID('change_master_password_button').onclick = () => {
		masterPasswordCache = masterPasswordInput.value; // Cache in case of user cancel.

		masterPasswordInput.value = '';
		masterPasswordConfirmInput.value = '';
		masterPasswordConfirmationRequired = true;
		showElement(masterPasswordConfirmInput);
		showElement(masterPasswordConfirmLabel);
		showElement(masterPasswordScreen);
	};

	// Import a CSV file.
	getByID('import_button').onclick = () => {
		const file = wp.brosweForAndLoadTextFile({filter: 'CSV Files (*.csv)|*.csv|All files (*.*)|*.*'});
		const lines = file.split(/\r|\n/); // Split into lines.
		for (let i = 0; i < lines.length; i++) {
			parts = lines[i].split(',');
			if (parts.length > 1) {

				const password ={
					uid: 0,
					title: parts[0],
					url: parts[1],
					user: parts[2],
					email: parts[3],
					pass: parts[4],
					notes: parts[5],
				};
				passwordFile.passwords.push(password);
				createPassword(password, true);
			}
			passwordsFileChanged = true;
			reorderPasswords();

			activateFirstPassword();

		}
	};

	// Export a CSV file.
	getByID('export_button').onclick = () => {
		let s = '';
		for (let i = 0; i < passwordFile.passwords.length; i++) {
			const password = passwordFile.passwords[i];
			s += `${password.title},${password.url},${password.email},${password.email},${password.pass},${password.notes}\n`;
		}
		wp.browseForAndSaveTextFile(s, {filter: 'CSV Files (*.csv)|*.csv|All files (*.*)|*.*'});
	};
	
	// Toggle password releaved or hidden.
	passwordVisibilityButton.onclick = () => passwordPasswordInput.classList.toggle('password');

	// Launch password url as a new process.
	openPasswordURLButton.onclick = () => {
		if (passwordURLInput.value != '') wp.launchProcess(passwordURLInput.value);
	};

	// Visit PassHerd Github repository.
	getByID('github_button').onclick = () => wp.launchProcess('https://github.com/Antix-Development/PassHerd');

	// Cycle font sizes.
	getByID('cycle_fontsize_button').onclick = () => {
		options.fontSize = (options.fontSize + 1) % 3;
		setFontSize();
		optionsChanged = true;
	};

	// Copy password username to clipboard.
	getByID('copy_username_button').onclick = () => navigator.clipboard.writeText(userNameInput.value);

	// Copy password password to clipboard.
	getByID('copy_password_button').onclick = () => navigator.clipboard.writeText(passwordPasswordInput.value);

	passwordList.tabIndex = -1; // Only elements with a tabIndex will receive keyup events.

	// Process hotkey presses for passwords list.
	passwordList.onkeyup = e => {

		const key = e.key.toLowerCase();

		if (!e.ctrlKey && !e.shiftKey && ! e.altKey) {

			if (key.length === 1 && /[a-z0-9]/i.test(key)) {

				// log(`key:${key}`);
	
				let 
				child,
				found;

				for (let i = 0; i < passwordList.children.length; i++) {
					child = passwordList.children[i];
					if (child.innerHTML.charAt(0).toLowerCase() === key) {
						found = true;
						break;
					}
				}
	
				if (found) {
					child.scrollIntoView();
					child.onclick();
				}
			}
	
			if (e.key === 'Delete') {
				deletePassword();
	
			} else if (key === 'ArrowUp') {
				if (selectedItem) {
					const autoSelectItem = selectedItem.previousElementSibling;
					if (autoSelectItem) {
						autoSelectItem.onclick();
						selectedItem = autoSelectItem;
					}
				}
	
			} else if (key === 'ArrowDown') {
				if (selectedItem) {
					const autoSelectItem = selectedItem.nextElementSibling;
					if (autoSelectItem) autoSelectItem.onclick();
					if (autoSelectItem) {
						autoSelectItem.onclick();
						selectedItem = autoSelectItem;
					}
				}
			}

		}
	}

	// Set dark theme.
	useDarkThemeButton.onclick = () => {
		showElement(useLightThemeButton);
		showElement(useDarkThemeButton, false);
		options.useDarkTheme = true;
		optionsChanged = true;
		setRootVariables(options.darkColors);
	};

	// Set light theme.
	useLightThemeButton.onclick = () => {
		showElement(useDarkThemeButton);
		showElement(useLightThemeButton, false);
		options.useDarkTheme = false;
		optionsChanged = true;
		setRootVariables(options.lightColors);
	};

	// "Okay" button in master password screen has been clicked.
	masterPasswordconfirmButton.onclick = e => {
		if (masterPasswordInput.value.length === 0) return; // Reject empty input.

		changeMasterPassword();
	};

	masterPasswordconfirmButton.onkeyup = e => {
		if (e.key === 'Enter') changeMasterPassword();
	};


	// Cancel master password change process, or exit if application has just launched.
	getByID('master_password_cancel_button').onclick = e => {

		if (masterPasswordConfirmationRequired) {
			// Cancel password change process.
			masterPasswordInput.value =  masterPasswordCache; // Reset from cached value.
			masterPasswordCache = null;
			showElement(masterPasswordScreen, false);

		} else {
			// Exit because application is waiting for master password at launch.
			wp.exit();

		}
	};

	// A key was pressed in the master password text input.
	masterPasswordInput.onkeyup = async e => {
		showElement(masterPasswordMismatchLabel, false);

		if (masterPasswordCache || masterPasswordInput.value === '') return; // Exit if master password is in the process of being changed.

		if (e.key === 'Enter') {
			if (isHidden(masterPasswordConfirmInput)) {
				loadPasswords();

			} else {

				if (masterPasswordInput.value === masterPasswordConfirmInput.value) {
					loadPasswords();

				} else {
					showElement(masterPasswordMismatchLabel);

				}
			}
		}
	};

	// A key was pressed in the master password confirmation text input.
	masterPasswordConfirmInput.onkeyup = e => {
		showElement(masterPasswordMismatchLabel, false);

		if (masterPasswordConfirmInput.value.length === 0) return; // Reject empty input.

		if (e.key === 'Enter') {

			if (masterPasswordConfirmationRequired) {

				if (masterPasswordInput.value === masterPasswordConfirmInput.value) {
					// Password inputs match.
					createNewPasswordFile();

					masterPasswordCache = null;
					passwordsFileChanged = true;
	
					showElement(masterPasswordMismatchLabel, false);
					showElement(masterPasswordScreen, false);

					notify('Master password changed.');

				} else {
					showElement(masterPasswordMismatchLabel);

				}
			}
		}
	};
	
	// Initiate resizing when primary pointer button is pressed (whilst over the drag pane).
	resizeBar.onpointerdown = e => {
		if (e.button === 0) {
			resizing = true;
			newX = e.clientX;
			document.body.style.cursor = 'ew-resize';
		}
	};

	// Close any currently open context menus when the window is clicked.
	window.onclick = e => hideContextMenus();

	// A key has been pressed.
	window.onkeyup = e => {
		
		const key = e.key.toLowerCase();

		if (key === 's' && e.ctrlKey) {
			savePasswords();
		
		} else if (key === 'n' && e.ctrlKey) {
			addPassword();
		
		} else if (key === '1' && e.ctrlKey) {
			// Copy username to clipboard.
			navigator.clipboard.writeText(userNameInput.value);

		} else if (key == '2' && e.ctrlKey) {
			// Copy password to clipboard.
			navigator.clipboard.writeText(passwordPasswordInput.value);

		} else if (key == 'Escape') {

			if (!masterPasswordScreen.classList.contains('hidden') && masterPasswordConfirmationRequired && passwordFile) {
				// Cancel master password change process.
				masterPasswordInput.value = masterPasswordCache; // Reset from cached value.
				masterPasswordCache = null;
				showElement(masterPasswordScreen, false);
			}

			hideContextMenus();
		} 
	}

	// Resize navigation pane when pointer moved while resizing is enabled.
	window.onpointermove = (e) => {
		if (resizing) {
			const oldX = newX;
			newX = e.clientX;
			dx = e.clientX - oldX; // Movement delta
			const width = clamp(listView.offsetWidth + dx, 24, 600); // Constrain width.
			containerView.style.gridTemplateColumns = `${width}px 4px 1fr`;
		}
	};

	// Stop resizing if primary pointer button is released.
	window.onpointerup = (e) => {
		if (e.button === 0) {
			document.body.style.cursor = 'default';
			resizing = false;
		}
	};

	passwordFile = wp.loadTextFile(`${WP_PATH}${PASSWORDS_FILENAME}`); // Load passwords file.

	if (passwordFile) {
		showElement(masterPasswordConfirmInput, false);
		showElement(masterPasswordConfirmLabel, false);

	} else {
		showElement(masterPasswordConfirmInput);
		showElement(masterPasswordConfirmLabel);
		masterPasswordConfirmationRequired = true;

	}

	// passwordTitleInput.focus();
	masterPasswordInput.focus();//onclick();

} // window.onload.

// The close button on the host winform has been pressed. Because `DelegateCloseEvent` in `app.json` is `true`, application exit must be explicitly handled here.
window.addEventListener('windowclose', async e => {

	if (passwordsFileChanged) {

		confirmationDialog({
			title: 'Please Confirm',
			body: 'One or more passwords have been modified. Do you want to save them before exiting?',
			confirm: 'Yes',
			cancel: 'No',
			onConfirm: async () => {
				await savePasswords();
				saveOptions();
				wp.exit();
			},
			onCancel: () => {
				saveOptions();
				wp.exit();
			}
		});

	} else {
		saveOptions();
		wp.exit();

	}
});

options = wp.loadTextFile(`${WP_PATH}${OPTIONS_FILENAME}`);

if (options) {

	options = JSON.parse(options);

} else {

	options = {
		fontSize: 0,
		fontSizes: [
			'1.6',
			'2.0',
			'2.4'
		],

		useDarkTheme: true,

		darkColors: [
			{name: '--text-light-color',				value: '#e3e3e3'},
			{name: '--text-dark-color',					value: '#1f1f1f'},
			{name: '--anchor-text-color',				value: '#a8c7fa'},
			{name: '--anchor-text-light-color',	value: '#d3e3fd'},
			{name: '--background-color', 				value: '#1f1f1f'},
			{name: '--background-bright-color', value: '#292929'},
			{name: '--surface-color', 					value: '#2d2f31'},
			{name: '--surface-bright-color', 		value: '#383b3c'},
			{name: '--primary-color', 					value: '#004a77'},
			{name: '--primary-bright-color', 		value: '#0f547d'},
			{name: '--secondary-color', 				value: '#107700'},
			{name: '--secondary-bright-color', 	value: '#1e7d0f'},
			{name: '--error-color',							value: '#dd6677'},
			{name: '--scroll-bar-color',				value: '#7b7c7e'},
			{name: '--elevation',								value: '#007c7e'},
			{name: '--elevation',								value: '#ffffff88'},
			{name: '--border-light-color',			value: '#ffffff33'},
		],

		lightColors: [
			{name: '--text-light-color',				value: '#1f1f1f'},
			{name: '--text-dark-color',					value: '#e3e3e3'},
			{name: '--anchor-text-color',				value: '#0b57d0'},
			{name: '--anchor-text-light-color',	value: '#041e49'},
			{name: '--background-color', 				value: '#ffffff'},
			{name: '--background-bright-color', value: '#e5e9ed'},
			{name: '--surface-color', 					value: '#f3f6fc'},
			{name: '--surface-bright-color', 		value: '#b8dbf0'},
			{name: '--primary-color', 					value: '#92d7ff'},
			{name: '--primary-bright-color', 		value: '#c2e7ff'},
			{name: '--secondary-color', 				value: '#caffc2'},
			{name: '--secondary-bright-color', 	value: '#e5ede5'},
			{name: '--error-color',							value: '#bb0000'},
			{name: '--scroll-bar-color',				value: '#cdcdcd'},
			{name: '--elevation',								value: '#ffffff88'},
			{name: '--border-light-color',			value: '#00000033'},
		],

	};
	optionsChanged = true;

	saveOptions();
}

if (options.useDarkTheme) {
	showElement(useDarkThemeButton, false);
	showElement(useLightThemeButton, true);

} else {
	showElement(useDarkThemeButton, true);
	showElement(useLightThemeButton, false);

}

setRootVariables((options.useDarkTheme) ? options.darkColors : options.lightColors);

setFontSize();
