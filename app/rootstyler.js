/**
 * RootStyler.
 * Set and get root class variables.
 * NOTE: RootStyler ONLY works with a :root node contained in an inline style, thanks CORS.
 * @copyright (c) 2023, Cliff Earl, Antix Development.
 * @license MIT
 * @namespace RootStyler
*/

let _rootNode; // The root pseudo-class node.

// Find the stylesheet with the :root node, then isolate the root node its self.
for (const sheet of document.styleSheets) {
  if (sheet.ownerNode.nodeName === 'STYLE' && sheet.ownerNode.textContent.includes(':root')) {
    _rootNode = Array.from(sheet.cssRules).find(rule => rule.selectorText === ':root') || null; // Convert the CSSRuleList to an array and use the find method to find the rule with :root selectorText.
    break;
  }
}

// Throw a hissy-fit if it wasn't found (which should never happen).
if (!_rootNode) {
	_rootNode = document.createElement('div'); // Just make a random HTML element (that has a style) so calls to `setRootVariable` and `setRootVariables` will fail silently.
	console.error('Unable to find root class. Setting variables will have no visial effect.');
}

/**
 * Set the given variable in the root class.
 * @param {RootVariable} variable The root variable to set.
 * @memberof RootStyler
 */
const setRootVariable = variable => _rootNode.style.setProperty(variable.name, variable.value);

/**
 * Set the array of variables in the root class.
 * @param {[RootVariable]} variables Array of root variables to set.
 * @memberof RootStyler
 */
const setRootVariables = variables => {
  for (let i = 0; i < variables.length; i++) setRootVariable(variables[i]);
};

/**
 * Update the given variables value from the corresponding variable in the root class.
 * @param {RootVariable} variable 
 * @memberof RootStyler
 */
const updateRootVariable = variable => variable.value = _rootNode.style.getPropertyValue(variable.name);
