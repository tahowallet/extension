import Wallet from '../pages/Wallet';
import Accounts from '../pages/Accounts';
import Earn from '../pages/Earn';
import Menu from '../pages/Menu';
import Send from '../pages/Send';
import Swap from '../pages/Swap';

export const routes = {};

export function registerRoute(name, Component) {
  routes[name] = Component;
}

registerRoute('wallet', Wallet);
registerRoute('accounts', Accounts);
registerRoute('earn', Earn);
registerRoute('menu', Menu);
registerRoute('send', Send);
registerRoute('swap', Swap);

export default routes;
