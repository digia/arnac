import Package from '../../package.json';


function middleware(plugin, options, next) {
  next();
}

middleware.attributes = {
  name: 'middlewarePlugin',
  version: Package.version,
};


export default middleware;
