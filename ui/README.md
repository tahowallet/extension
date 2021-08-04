# Tally Extension Frontend 🐕

![Screen + Browser Mock](https://user-images.githubusercontent.com/1918798/125732391-29da0e00-0796-49bb-895d-35de187b141d.png)

Welcome to the frontend portion of the Tally browser extension. This is the React portion of the codebase which handles UI related states, and communicates with the background script API `@tallyho/tally-api`. The intent is for all communication with outside APIs to strictly happen within `@tallyho/tally-api`, not here. This frontend only contains what's needed to provide the visual goodness!

## Prerequisites ✍️

Make sure to have these installed,

- [Git](https://git-scm.com/)
- [Node](https://nodejs.org/en/) (Tested on v12.17.0)
- [Yarn](https://yarnpkg.com/)

Check out these docs,

- [Redux Toolkit](https://redux-toolkit.js.org/api/configureStore)
- [react-chrome-extension-router](https://github.com/kelsonpw/react-chrome-extension-router)
- [styled-jsx](https://github.com/vercel/styled-jsx)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)

## Running in development 🚀

First, install the node modules:

```bash
yarn install
```

If you run into `The engine "node" is incompatible with this module.`, try adding `--ignore-engines` for now.

Then, start up the dev server:

```bash
yarn start
```

Load the unpacked extension for your web browser via the `/build` directory. Currently builds are tested to work on Chrome and Brave browser.

## Routing 🚦

### How to add a page

1. Create a new component inside the pages directory.
2. Place the page content inside of CorePage to get the top bar (account and network switcher) and tab bar
3. To make this page available to the router links, register the route at the end of the file

For example,

```
import { registerRoute } from '../config/routes';
import CorePage from '../components/Core/CorePage';

export default function ExamplePage() {
  return (
    <>
      <CorePage>
        <span className="example_class">ExamplePage</span>
      </CorePage>
      <style jsx>
        {`
          .example_class {
            color:
          }
        `}
      </style>
    </>
  );
}

registerRoute('earn', Earn);
```

⚠️ Styles are inside of the jsx via [styled-jsx](https://github.com/vercel/styled-jsx)

### How to link/navigate to a page

1. Import the Link component which acts as an `a tag`/anchor element.
2. In order to link to a page, `<Link/>` has a prop called `component` which is where to navigate to. Getting the component to navigate to is easy when you **import `routes` from the config folder**.
3. Implement link like so,

```
import { Link } from 'react-chrome-extension-router';
import { routes } from '../../config/routes';
...
<Link component={routes['send']}>
  <SharedButton
    label="Example"
    size="medium"
    type="primary"
  />
</Link>
```

⚠️ The key used in the routes object is set at the end of a page file with `registerRoute('example', Example);`. Typically the key name is page's name but in camel case.

## Primary file structure 📁

```
/pages
# Folder for components that serve the components for pages, primarily tabs

/components/GroupName/GroupNameComponentName.js
# Components are grouped by concern, like TabBar, where the primary component
usually is named the same as the group. All components here are prefixed
by the folder they're in.

/public
# Static assets like fonts and images

/slices
# Reducers and actions consolidated as files here. Interacting with the project's background.js api and using its data to populate frontend's state happens here
```
