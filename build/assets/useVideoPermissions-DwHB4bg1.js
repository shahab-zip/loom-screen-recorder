import{c as u,h as t,i as o,b as a}from"./index-4VNYQ_TM.js";/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]],p=u("pen",d);function l(e,n,r){return e.isSuperAdmin?!0:e.role?t(e.role,"video:delete-any")?!0:!r||!n.ownerId?!1:n.ownerId===r&&t(e.role,"video:delete-own"):!1}function f(e,n,r){return e.isSuperAdmin?!0:e.role?t(e.role,"video:edit-any")?!0:!r||!n.ownerId?!1:n.ownerId===r&&t(e.role,"video:edit-own"):!1}function m(e){const{state:n}=o(),{currentRole:r}=a(),i={role:r,isSuperAdmin:n.currentUser?.isSuperAdmin??!1},s=n.currentUser?.id??null;return{canDelete:l(i,e,s),canEdit:f(i,e,s)}}export{p as P,m as u};
