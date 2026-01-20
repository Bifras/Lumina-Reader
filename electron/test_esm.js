import { app } from 'electron';
console.log('App is:', !!app);
if (app) console.log('App name:', app.getName());
app.quit();
