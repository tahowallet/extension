export const routes = {};

export function registerRoute(name, Component) {
  routes[name] = Component;
}

export default routes;
