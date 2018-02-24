# pixelpusher

![](screenshots/animation-cat.gif)

Read the announcement blog post here:

[Pixelpusher: Real-time peer-to-peer collaboration with React](https://medium.com/@pvh/pixelpusher-real-time-peer-to-peer-collaboration-with-react-7c7bc8ecbf74)

## Installation

```bash
# Install latest node. I'm using 9.2.1
brew install yarn
brew install openssl
yarn

export CPPFLAGS=-I/usr/local/opt/openssl/include
export LDFLAGS=-L/usr/local/opt/openssl/lib
yarn start
```

You can start additional clients by setting `CLIENT_ID` (default: 0):

```
CLIENT_ID=1 yarn start
```

If you want to edit the CSS, for now, start the css watcher separately:

```bash
yarn run css
```

![pixelpusher](screenshots/screenshot-cat.png)
