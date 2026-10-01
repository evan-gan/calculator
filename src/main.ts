import { mount } from 'svelte';
import App from './App.svelte';
import './styles/global.css';

const target = document.getElementById('app');
if (!target) throw new Error('index.html is missing the <div id="app"> mount point.');

export default mount(App, { target });
