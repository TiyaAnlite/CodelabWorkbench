---
icon: note-sticky
order: 3
title: 技术备忘
date: 2023-07-31
category: 技术向
tag:
    - 技术备忘
article: false
isOriginal: true
---

> 这里主要收集一些在开发使用过程中遇到的各种杂七杂八的坑，为了减少重新搜索资料的时间收集的一些解决方案

<!-- more -->

## Tmux相关

### 分屏

左右：Ctrl+B+%
上下：Ctrl+B+"

### 鼠标滚轮支持

默认Tmux是没有鼠标滚轮支持的，这导致无法看到终端的历史记录，只需要执行一次设置即可

```
tmux set -g mode-mouse on  // 适用于Tmux 2.1版之前
tmux set -g mouse on  // 适用于Tmux 2.1版之后
```

---

## Screen相关

### 鼠标滚轮支持

screen默认也是屏蔽了滚动条，需要编辑用户配置打开

``` shell
vim ~/.screenrc
```

插入一行

```
termcapinfo xterm* ti@:te@
```

---

## Github连接代理(SSH)

对于HTTP方式克隆只需要配置`http_proxy`和`https_proxy`即可，但是对于SSH来说有很大不同，这需要新建一个ssh用户配置文件，然后添加诸如以下配置，一般来说用户的ssh配置文件都在`~/.ssh/`下

``` yaml
Host github.com
    HostName github.com  # 也可以用%h值的内容是一样的
    User git
    IdentityFile ~/.ssh/github  # 你的密钥文件地址
    ProxyCommand connect -S 127.0.0.1:10808 %h %p  # 代理指令，HTTP方式使用-H，SOCKS方式使用-S
```

`connect.exe`其实本质上是一个代理转换工具，不过`git bash`已经自带了，在使用git进行连接时似乎是可以自动找到这个工具，换句话说Win不需要手动安装就能直接用了

---

## Docker相关

### 非Root用户执行docker命令

默认情况下，只有用root权限才能用docker命令与本机docker daemon交互，当无权限的时候会提示以下信息

```
Got permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: Get "http://%2Fvar%2Frun%2Fdocker.sock/v1.24/containers/json": dial unix /var/run/docker.sock: connect: permission denied
```

其实本质上就是`/var/run/docker.sock`这个docker API接口没有访问权限，它是一个unix socket，与普通的socket不同的是，访问同样遵循一贯的一切皆基于文件的惯例，因此socket的访问会受到这个文件本身的权限控制，查看这个文件的权限可以看到

```
srw-rw----  1 root    docker     0 Jul 31 01:05 docker.sock
```

它其实所属`docker`组，所以实际上只要将当前用户加入这个用户组，就能访问这个socket了

```
usermod -aG docker $USER
```

然后重新注销并登录，就能在当前用户下使用docker指令了

> 不过这项操作要谨慎，因为这样的话普通用户也能执行创建容器指令，甚至创建特权容器，从而获得对系统的控制权。如果你实在是需要安全性，同时愿意牺牲特权容器的功能，不妨试试[Rootless模式](https://docs.docker.com/engine/security/rootless/ "Run the Docker daemon as a non-root user (Rootless mode)") !!反正我是嫌麻烦没用过!!

---

## Node相关

### Linux安装与维护

直接用包管理器安装的node版本很低，很多功能都不支持(只到12)，例如corepack之类的东西都不支持，不过可以先安装npm，然后用npm来更新node

``` shell
npm cache clean -f  // 先清理缓存
sudo npm stall -g n  // 注意权限
sudo n stable  // 更新到最新稳定版(或者用latest到最新版)
```

更新过后它可能会提示你由于可执行文件路径的变化，需要刷新一下路径缓存

```
Note: the node command changed location and the old location may be remembered in your current shell.
         old : /usr/bin/node
         new : /usr/local/bin/node
If "node --version" shows the old version then start a new shell, or reset the location hash with:
hash -r  (for bash, zsh, ash, dash, and ksh)
rehash   (for csh and tcsh)
```

刷新路径缓存后，corepack也已经生效

### 使用corepack工具启用yarn和pnpm

在确保corepack已经能使用的情况下，执行并开启corepack

``` shell
corepack enable
```

有时如果工具太旧，可以用下面的命令进行更新

``` shell
corepack prepare pnpm@latest --activate
corepack prepare yarn@2.2.2 --activate  // yarn没有latest
```

> [!tip]
> 在help中会提示两个包管理器的最新版本

---

## 系统维护相关

### 硬盘SMART

需要安装`smartctl`工具，它包含在`smartmontools`软件包底下，然后执行命令查询对应硬盘的SMART

```
sudo smartctl -a /dev/sda
```

添加`-j`参数还能以json形式输出方便进行自动化收集

### 文件同步

很多时候往往有跨服务器的文件同步需求，可以使用`rsync`结合`ssh`通道的方式实现跨区域的传输

```
rsync -Pvcrt --append --rsh=ssh [本地文件] [远程地址]:[远程文件]
```

其中，`P`为`--partial --progress`的别名，即呈现备份过程并启动断点续传，`-v`为详细模式输出，`-c`为打开文件校验，`-r`对子目录进行递归处理，`-t`保留源文件的时间信息，`--append`指定文件接着上次中断的地方，继续传输

还能使用`--bwlimit=KBPS`来限制传输速度，来避免在后台长时间传输时收到其影响

- 如果打开了校验，会在正式开始前先对所有需要传输的文件计算校验值，如果一次性同步的文件较大，可能需要花费较长的时间

使用`-c`会在源目录很大时导致传输前准备时间很长，可以尝试使用`--append`替代`--append-verify`的方式来指定每个文件传输后再进行校验

```
rsync -Pvrt --append-verify --rsh=ssh [本地文件] [远程地址]:[远程文件]
```

ssh可以指定参数，例如端口，但是要记得给参数带上引号

```
rsync -Pvrt --append-verify --rsh="ssh -p 222" [本地文件] [远程地址]:[远程文件]
```

使用`--remove-source-files`可以在同步完成后删除源文件，起到类似于`mv`的效果

```
rsync -Pvrt --append-verify --remove-source-files --rsh="ssh -p 222" [本地文件] [远程地址]:[远程文件]
```

- `--delete`参数可以删除远程目录里面存在而源目录不存在的文件，从而严格保持远程目录与源目录一致，这个用法一般用于做镜像同步

当然，用于本地同步也是可以的，相较于`cp`和`mv`，还可以提示进度和时间。对于本地同步而言，一般多采用`-a`参数

```
rsync -aP [本地文件] [目标文件]  // 类似于cp
rsync -aP --remove-source-files [本地文件] [目标文件]  // 类似于mv
```

`-a`参数是`-rlptgoD`的别名

- `-l`同步链接
- `-p`同步权限
- `-g`同步组
- `-o`同步用户
- `-D`为`--devices`同步设备文件和`--specials`同步特殊文件