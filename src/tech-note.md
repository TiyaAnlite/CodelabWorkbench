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

> [!caution]
>
> 这项操作要谨慎，因为这样的话普通用户也能执行创建容器指令，甚至创建特权容器，从而获得对系统的控制权。如果你实在是需要安全性，同时愿意牺牲特权容器的功能，不妨试试[Rootless模式](https://docs.docker.com/engine/security/rootless/ "Run the Docker daemon as a non-root user (Rootless mode)") !!反正我是嫌麻烦没用过!!

---

## Node相关

### Linux安装与维护	

**维护成本较高，建议使用下文提到的版本管理工具**

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

### 使用corepack工具启用yarn和pnpm(不好用，别用)

在确保corepack已经能使用的情况下，执行并开启corepack

``` shell
corepack enable
```

有时如果工具太旧，可以用下面的命令进行更新

``` shell
corepack prepare pnpm@latest --activate
corepack prepare yarn@stable --activate
```

### Node.js版本管理

建议使用`nvm`作为node版本管理的工具，项目地址：https://github.com/nvm-sh/nvm

> 对于Windows可以直接使用[Scoop](https://github.com/ScoopInstaller/Scoop)来进行安装`nvm`，对于Windows的包管理推荐使用此工具

想要下载并使用一个版本的Node也非常简单：

``` bash
nvm install 22
nvm use 22
```

---

## 系统维护相关

### 硬盘SMART

需要安装`smartctl`工具，它包含在`smartmontools`软件包底下，然后执行命令查询对应硬盘的SMART

```
sudo smartctl -a /dev/sda
```

添加`-j`参数还能以json形式输出方便进行自动化收集

### 磁盘低格

在Linux直接用`dd`全零覆写全盘即可

```
dd if=/dev/zero of=/dev/sda
```

### 磁盘占用

如果在尝试卸载磁盘时发现`arget is busy`的情况，可以使用`fuser`来检查

```
fuser -mv /mnt/mountpoint  // 检查正在占用的进程
fuser -kv /mnt/mountpoint  // 杀死占用进程并再次检查占用情况
```

> 如果你希望在发送之前得到提示，可以使用-i 选项

确认无误后即可卸载

### 碎片整理

#### XFS

虽说XFS的延迟写入技术可以减少碎片出现，但是对于用了很长时间且文件使用频繁的还是有必要整理的，但是大多数时候，都不需要优先考虑碎片问题，一般性能瓶颈不在这里，所以应用时一定要了解这块盘的使用场景

首先要先确保相关的xfs工具已经安装，一般对于xfs的发行版都会有

- XFS的相关工具在`xfsprogs`，而`xfs_fsr`位于`xfsdump`包

然后先查询碎片情况

``` bash
// 以下指令二选一，输出的结果不完全一样，具体没有研究
xfs_db -c frag -r /dev/sda1
xfs_db -r -c "frag -f" /dev/sda1
```

输出样例如下

``` bash
actual 4009, ideal 1054, fragmentation factor 73.71%
Note, this number is largely meaningless.
Files on this filesystem average 3.80 extents per file
```

理想情况下，`extents`区段应该趋近于1，表示基本没有碎片，碎片因子是由理想区段数量`ideal`与实际区段数量`actual`的比值得来，这个数字只能做大致评估，并不意味着数值高对性能影响就大

如果要整理碎片，可以使用fsr工具

``` bash
xfs_fsr /dev/sda1
```

使用`-v`可以详细输出，这是一个阻塞操作，如果需要时可以通过其他途径放置到后台运行

> 磁盘碎片过多引发的其他问题 – 内存死锁问题
>
> 当某compute节点的磁盘碎片非常多时，我们发现compute节点上运行的虚拟机非常卡，基本的读写操作都无法进行。当我们查看compute节点的messages日志时，发现内存死锁的error信息。
>
> ``` bash title="/var/log/messages"
> kernel: XFS: worker(28076) possible memory allocation deadlock size 2133872 in kmem_alloc (mode:0x250)
>         XFS: worker(34675) possible memory allocation deadlock size 2191488 in kmem_alloc (mode:0x250)
> ```
>
> 我们需要先释放一下内存
> `echo 1 > /proc/sys/vm/drop_caches`
> 待compute节点不再报内存死锁的error，再进行磁盘碎片的检查和整理。
>
> (引用自：[磁盘碎片整理方案](https://blog.csdn.net/cuigelasi/article/details/78476917))

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

### 网络配置(netplan)

> netplan是Ubuntu在18.04版本后新引入替代的网络管理工具

- 接口命名：现在的Ubuntu基本上不会采用之前诸如`eth0`这样的名字，而是使用`enp1s0`这样不好记也不好打的名字，可以使用`set-name`改为自己便于记忆的名字，但是要注意为了能让netplan找到对应网卡，也需要指定`match`配置
- 禁用ipv6：这个需求出现的原因是由于一些特殊网络，即使是ipv6能分配到global地址但是依旧无法正常使用的问题，如果不处理的话会导致DNS使用v6地址而导致网络异常，但是又不想为此在内核参数中直接禁用ipv6功能，此时只需要指定`link-local`参数避免连接ipv6地址即可，[参考资料](https://askubuntu.com/questions/1146316/how-to-use-netplan-to-remove-ipv6-address-on-a-single-interface)

整体的参考配置：

``` yaml
network:
    ethernets:
        lan:
            match:
              macaddress: a4:bb:6d:13:9c:97
            set-name: lan
            dhcp4: true
            dhcp6: false
            link-local: [ipv4]
    version: 2
```

### 日志清理

有时候，我们希望在不停止或重启程序的情况下，清理其运行过程中的日志。首先，直接删除这个文件是**不行**的，Linux与Windows不同，当该日志文件被进程打开时，Windows会提示文件被使用无法被删除，而Linux下删除不会有任何影响，但是由于文件句柄还是打开的状态，实际上操作系统会保留这个文件直到所有文件句柄被关闭，在此期间对应程序依旧可以使用这个句柄对这个消失的文件进行读写。因此从客观上，这部分占用的空间是并没有被释放的，自然无法达到所预期的目的

要想实现这个目标，可以通过裁切原本的文件实现，因此在这里可以利用`truncate`命令

``` bash
truncate -s 0 xxx.log
```

使用`echo`理论上也行，但实际上我自己试的时候好像还是不行，用上面这个最为保险

> 如果不小心删掉了未关闭句柄的文件，会导致文件找不到但空间仍被占用的问题，可以通过查询文件句柄找到这些仍在运行的进程：
>
> ```bash
> lsof -nP | grep -i deleted
> ```
>
> ``` bash
> find /proc/*/fd -ls 2>/dev/null | grep deleted
> ```
> 
> 这些文件可以直接通过操作句柄来完成上面的清理操作而无需重启进程
> 
> ``` bash
> truncate -s 0 /proc/1234/fd/1
> ```

## Mac使用相关

### 解决『应用已损坏』问题

在MacOS 15中的安全策略已经只能设置可信来源为App Store或者已知开发者，未签名的应用无法直接运行，可以在终端中对这个应用执行以下命令即可使用

```bash
xattr -cr /Applications/xxx.app
```

