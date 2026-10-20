import { mount } from 'svelte';
import ScientificApp from './ScientificApp.svelte';
import '../styles/global.css';

const target = document.getElementById('app');
if (!target) throw new Error('index.html is missing the <div id="app"> mount point.');

export default mount(ScientificApp, { target });
