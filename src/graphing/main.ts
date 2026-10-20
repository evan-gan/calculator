import { mount } from 'svelte';
import GraphingApp from './GraphingApp.svelte';
import '../styles/global.css';

const target = document.getElementById('app');
if (!target) throw new Error('graphing/index.html is missing the <div id="app"> mount point.');

export default mount(GraphingApp, { target });
