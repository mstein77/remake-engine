import {
    Screen, Resources, LinearGradientPane, PatternPane, SpritePane, TilesPane, TilesMap,
    TILE, TextPane, SpriteSheet, InputController, INPUT, PATH, AxisPath
} from "remake-engine"

// define some helper functions

function toHex(r, g, b) {
    return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0')
}

function clamp(min, value, max) {
    if (value < min) return min
    if (value > max) return max
    return value
}

const getRandomInt = (maxInt, minInt = 0) => minInt + Math.round(Math.random() * Math.abs(maxInt - minInt))

function getColorPath(from, to, steps, type = PATH.TYPE.STRAIGHT) {
    const red = new AxisPath(from[0]).addTarget(to[0], steps, type).round().getPoints()
    const green = new AxisPath(from[1]).addTarget(to[1], steps, type).round().getPoints()
    const blue = new AxisPath(from[2]).addTarget(to[2], steps, type).round().getPoints()
    const colors = []
    for (let i = 0; i < steps; i++) colors.push(toHex(red[i], green[i], blue[i]))
    return colors
}

// okay, let's define the screen
export default Screen(
    // here we can set image, audio or JSON resource which are used in this screen
    Resources({
        "image": {
            "pattern.png":
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAfklEQVQ4T6WPUQ6AMAhD4c8jekSP6N9Ml3TZKmQY349QWph++NnMzO52Ob4VmAE+N5Ul6u8BFVkrkW+Yo+FMNl+MmSnTwfaS9qzJSwBziERhEIpgd5mEg18v0MvasyaLkJkzHZRMIJv3IhsqkW/7j4r6x4JKmMxL+oIvYcIlD7uQbDEYLsCpAAAAEGRlQkdCMEU2ODRGNEJFNTY3NzNCs5vgnwAAAABJRU5ErkJggg==",
            "tiles.png":
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAQCAYAAABQrvyxAAAA9UlEQVRIS9WWMQ7CMAxFycZ1GLkJC6dj4SawMXIVJIZWRvrI+smvnaYDvKWO8129pEvLbpDD8TzZ83G7FPQiMGM87+/P8zVd0/P7cvrOp4cUXiZzCM57mcwhOB8OZGAp1IzKsRRqppWT4V6UHIj2W3IetV8FR1CSqs8oSdU35MvWwrK8Rq1gWV6jBlVjC7w0yMgDLw1a8kazuQW9N89ENw/kxgh//QX45nmNWsE3z2vUoGqMoGRVn1Gyqm/Il/USSUb7S5KG2q+Ca4jkgMopOaaVk+EsSkrB+ZbUEpwPByIglJEH/hA/8TfaIw9wCDtA5uYZfIkZNLrdMeQHZ8QAAAAQZGVCRzREQTM0NTI5MTNDRUQyMzPri2LDAAAAAElFTkSuQmCC",
            "sprites.png":
                "data:image/png;base64,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"
        },
        "audio": {
            "pad.wav":
                "data:audio/wav;base64,UklGRmQfAABXQVZFZm10IBAAAAABAAEAoA8AAKAPAAABAAgAZGF0YUAfAADH1NPMxcC5srK5vbepnJGFeHV9hoeAenVqWk9NTktITFhkbXaEjYh5bWloaXOJoa6wsLCso5ucnpeGc2FOOSgiIyUnMEVhfZi1zNXSysS/t7G0vL20ppuQgnd2f4WBenZxZVZPT09KSE5bZ298ipCHd2xoZmh1jaOtrq+wq6Gcnp6TgG5eSjUoJCUlJzNJZoGevNDW0cnEvbWxt768sqWbj4B2eICBe3VybGBUUFFPSUlRXmlzgpCRhHVsZ2RoeJGkq62wsKqhnaCcjnpqWkYzKCYmJSg2TmqGpcLT1c/Iw7uzsrq/u6+kmo1+dnp/fXVxb2hcU1JTT0lKVWFseImUkYJza2ZjaHyUpKqtsLCooJ+hmYh1ZlZCMSooJyUpOVJui6zH1dTOyMK5srS8v7ito5qLfXd7fnhwbWtjWFNUVE1ITFhkb36Pl5B/cmpkYWqAl6OorbGvp6GioJWCcGJSPjArKiclKz1WcpGzzNXTzMfAt7K2vr62q6OYiXx5fHpya2lnX1ZUV1RMSU9bZ3OElZmOfXFpYmFthJiip62xrqaio5+QfGxfTTsxLSsnJS5CWnaYus/V0czHv7Wzub+9s6qjl4d8e3x2bGZlYltVVlhTS0pTX2p4i5mZi3twZ2BhcYeYoKausaympKScindpW0k6MjAsJiYxRl58n8DR1NDLxry0tLy/urGqopWFfXx6cGZiYl5XVVhZUktMVmFtfZGdmIl6b2ZfY3SKl56mr7Grp6akmIRyZVdGOTQxLCYoNUpjgqfF0tPPy8S6tLe+vrevqaGThH59d2phX15aVVZaWVBLT1lkcYSXn5aGeW5kXmV4i5adp6+wq6ioo5J+bmJTQzk2MismKjlOZ4muyNLRzsrDubS5v721rqmgkYSAfXJkXFtbVlRYXFhPTFJdZ3aKnJ+UhHhtYl5oe4uUnKivr6uqqaCMeGpeT0E6ODMqJy09UmyQtcvR0M3Jwbe1u7+6sq2pno+FgXttXlhYV1NUWl1WTk1VYGt7kaCekYN3a2BfbH6Kkpypr66rrKmchnNnW0xAPDkyKigxQVZymLrM0M/NyL+3t72+t7GtqJ2PhoJ3Z1lVVVNRVVxdVU5QWWNvgpeinI+CdmlfYW9/iZGdqq+trK2oloBvZFdJQD46MikqNEVaeaC+zM7OzMe9t7q+vLWvraebjoiBc2BVUlJQUFdeXFNOU1xmc4icopqNgXVnX2Ryf4eQnquurq6upZB7bGFUR0FAOzEqLThIX4GnwcvNzczFu7i8vrmyr62mmo+Jf21bUU9OTVBZX1pSUFZfaXmPoKKYi4F0ZmBndH6FkKCrrq6wrqGKdmldUEZDQjowKzA8TGWJrcPKzM3Lw7u6vb22sK+tpZmQiXxnVU5MS0tRW19YUVJaYm1/laKglYqAcmRhanV8g5Ghq66vsq2chHJmWk1GRUM5LywzP1BrkLHDyczNysG7u767s6+vraOYkYl3YVFLSkhKU11eV1JVXWVxhpqjnpOKf3BkZG11eoKSoquusbOqln5uY1dLR0dDOC8vN0NVc5i1w8jLzcjAu72+uLGvr6yimZKHcltNSEdGSlVeXFVTWWBod4yeo5ySin1uZGZvdHiClKOrr7Ozpo95a2BTSklJQjcwMjpHWnqet8HHy8zHv72/vbWvr7CroZqThGtVSkZEREtXXlpUVVxjbH2SoaGZkYl8bWZpb3J2g5akq7C1sqGJdWhcUUpLSkE2MTU+S2GCo7fAxsvLxb++v7uyra+vqaGbkn9lUEdDQUNMWV1YVVhgZnGDmKKfmJGIemxna29wdYWXpKuytq+bg3JlWU9LTUpANjQ5Qk9niae3v8bLysS/wL+4r62vr6iinJF5XkxEQD5DTlpbV1ZcY2p2ipyinZeRh3hsam1ubnWGmKSstLaslX5vYlZNTU5JPjY3PUVUb5Cptr7Gy8nDwMG+ta2tsK6oop2Nc1lJQj49Q1BaWVZYX2Zte5CeoZuWkYZ3bWxtbGx2iJmkrbW1p496bF9TTU5PSD04OkBJWnaVqrW+x8rHwsHBu7GsrbCtqKSciWxURj87PEVSWVhWW2NpcYKVoJ+alpCEdm5ubWlqd4qapa+3s6GJdmlcUU5QT0c9Oj5ETWB9maq0vsfKxsPDwbmuq66wrKilmoNmT0Q9OTtHU1hWV15mbHaImaCdmZaPgnVwb2tnanmMmqaxt7CbhHNmWVBPUk9FPT1BR1FnhJups7/HyMXDxMC1rKuvr6yppZd9YExBOjc8SFNWVVliaXB8jpyfm5iWjoF2cnBpZGt7jZuos7arlYBxY1ZPUVNORD5ARUtXbomcqLO/x8fFxMS9sqqrr66sqqWTdlpJPzg2PUpTVFVcZWx0gpOdnZmYlo2Ad3RvZmNsfo6cqrW1po98bmBUUFJTTENAREhOXXWNnKe0wMfGxcbDuq6prK+urKujjm9WRzw1NT9LUVJWX2lveIeXnZuZmZaLf3l1bWRiboCPnay1sqCKeWtdU1FUUkpDQ0dMU2N7j5yntMHGxcbGwresqa2vra2soIdpUkQ6NDZAS1BSWGNsc32Nmp2ZmJmVioB6dWthY3CBkJ+uta2ahndpWlJSVVFJREZLT1hqgJGbp7XBxcXGx8Czqqqtrq2uq5yBZE9CNzI3QktOUVtnb3aDkpubmJmZlImBfHRoX2RygpGhsLSolYN0ZlhSVFVPSEZKT1NdcISRmqe3wcTFx8a9sKmrrq6ur6qXel9NPzUyOENKTFJeanJ7iJacmZeZmZKJgn1yZF9mdIOTpLGxo5CAcmJWU1VUTUhJTlJXY3aGkJqouMDDxsjFua2pq66ur7CokXRbSj0zMjlDSExUYm52gI6Zm5eXmpmRiYN8b2JfaHaFlKaxrZ2MfW9gVVRWU0xJTFJVW2l7iI+aqrjAw8fIw7arqaytrrCwpItuWEg6MTI6QkZLV2ZxeYWTm5mWmJuYkImFe2xgX2p4hpeosKiYiHtsXVVVVlFLS1BVWWFvf4iOmqu5v8PIyMCyqqqtra6xr5+EaVVFODEzO0FFTFtqdH2Kl5uYlZibl5CKhXlpXmFseYeZqa2jk4V4aVtVVlVPS01UWV1mdYGHjpytub/EyMe8r6qrra2vsq2afmVTQjUwNDtARE5fbniCj5malpWZm5aQjIV2Zl5jbnqJnKqqno+DdmZaVldUTUtRWFxhbHmCho6drri/xcnFua2qrK2tsLKpk3hiUEAzMDU7PkRRY3F7h5SbmZWWmpqVkI2Ec2NfZW97jJ6pppmMgXNjWVdWUkxNVVxgZnJ9goWPn6+4v8bIwrWsq6ysrbGxpY10X049MjE1Oj1FVGd0f4yYm5eUl5ualZGNgW9iYGdxfY6gp6GVin9wYVlYVlBMUFlfY2t3f4KFkKGvuMDHx76yq6ysrK6yr6CHcF1LOjEyNTg8RlhqeISRm5uVlJibmZWSjX5sYWJpcn+RoKSckYh9bV9ZWFROTVNdY2hxe4GBhZKjr7jBx8W7sKysrKyvsqyagm1aSDgxMjU2O0ldbnuIlpyalJSZm5iVk4x7aWFkanOBk6Cgl46GempeWlhSTU5XYGZsdn+BgIaUpK+4wsfDuK6sraytsLKolH1qWEU3MTI0NTxMYXJ/jZqdmJOWmpuYlpSKd2diZmx0g5WenJOMhHdoXlpXUExRW2RqcXuBgH+HlqSvucPGwLWura2srbGwpI55Z1VCNTIyMjQ+UGV1g5KdnJaTl5uamJeTh3RnZGdtdoaWnJeQioJ0Zl5aVU5MVF9obnZ/gn9/iZilr7rDxLyyrq6trK6yrp6JdmVSPzUyMTAzQFRpeYiXnpuVlJibmZiYkoNxZ2ZpbniIlZiTjYiAcWVeWlNMTlhja3J7g4J+gIuZpa+7w8K5sa+vrayvsaqZhXRiTz00MjAvNENZbH2Nm5+alJWZm5mZmJB/b2doam96ipSUj4uHfW9kXllRTFBcZ293gIWBfYGNmqWwvMK/trCwsK2tsLCmk4FxYEs8NDEuLTVHXXCBkp6fmJSXmpqZmpiOfG5paWtwfYuSkIuJhXptY15XTkxTYGtyfISGgH2Dj5ulsb3BvLSxsbCtrrGuoY5+b1xJOzQwLC03S2FzhZagnZeVmJuamZuXinlta2tscn+Lj4uJiIN3a2NdVU1NV2Rud4GIhn99hZGbprO9v7mysbKwra+wqpuKfG1ZRjo0LiotOk9kd4qaoJyWlpqbmZqblYZ2bmxsbXSBiouIh4eBdWpjXFJLT1tocnuFioV+f4iSm6e0vby2srOysK6wr6aWhnlqVkQ5MywpLj5TaHyPnaCalpebmpmbm5ODdW9ubG52goiHhYaGfnJpY1pPS1JgbHWAiouEfoCKk5yotbu5tLK0s6+vsK2ikYR3Z1NCOTEqKDBBV2yAlKCfmZaZm5qanJqPgHVxb21veIKFg4OFhHxxaWJXTUxWZG95hY2Lg36Di5OcqbW5trKztbOwr7CqnI2BdWNQQTgvKCgyRVtwhZihnpiYm5uZmpyZjH11c3BucXqBgX+BhYJ5b2hgVExOWmhzfomPi4J/hY2Tnaq1t7OytbazsLCvppiKgHNgTUA3LSYoNUledIqboZ2YmZybmZucloh8d3Rxb3N7f319gISAd25oXlJMUV5rdoOOkIqCgYeNlJ6rtLSxs7a2s7CxraKTh35wXUs/NSslKjlNYniPnqCcmZudm5mcm5OFfHh2cXB0e3x6e4CDfnVuZltPTFRib3qHkZGIgoOJjpSfrLKxsLS3trOxsaudj4V8bVpKPjMoJSw8UWZ9k5+fm5udnZqanJqQg3x6d3Jxdnp5dnmAgXtzbWVYTk5YZnJ/jJSQh4OGio6Voaywr7C1uLazsrCnmIyEemlXSDwwJiUuQFRqgpegnpucnp2am5yYjIJ9fHdycnd4dXR5f395cmxiVU1QXGp2g5CVj4eFiIuOlaKrra2xt7m2s7Kuo5SKgndmVEc6LSQmMkNXboeZn52cnp+cmpuclYmBf314c3R3dXFyeX59d3FrX1JNU2BteoiUlo6Hh4qLjpeiqaqssri5trSyrJ6QiIF0Y1JFOCojJzVHW3OLm5+dnaCgnJqcmpGHgoF+eHR1dnJucXl9enVxaVxQTldkcX6NlpWNiImLi46YoqeorLS6ura1sqiZjYd/cWBRQzUoIyo4Sl94j5yenZ+ioJybnJiOhYODf3h1dnRua3B4e3h0cGZZT1FbaHSCkZiVjYqLjIuPmaGkpq22u7q3tbCklYuFfW1dT0ExJiQsO01jfZKcnZ6io5+bm5uVi4WFhH95dnZxamlweHl2c25jVk9UX2t4h5WZlI2MjYyLkJmgoqWuuLu6uLWuoJGJhHpqW00+LiQlLz5QZ4GUnJ2gpKSfnJyakomGh4Z/eXd1bWdocHd3dHJsYFNQV2NvfIyYmZOOj4+Mi5GZnp+lsLm8uri1q5uOiIJ3Z1lLOyskJzJBVGyFlpudoqaknpycmI+Hh4mGf3p4c2pkaHB1dXNxal1SUltmcoCQmpmTkJGQjIySmJueprO7vLq5s6eXjIeAc2RXSDcpJCo1RFdxiZabn6SnpJ6cm5WMh4mLh4B7eHBmYmhwc3NycGdZUlVfanWFlJuYk5OTkIuMkpeYnai1vLy7ubGik4uGfnBiVUU0JyUsOEdcdYuWm6GnqKOenZqSioiLjIeAfHdsYmFob3FxcW5jV1JYYm15iZebmJSVlZCLjZKVlp2rt7y9vLmunpCKhXtsX1JCMCYnLzpKYHqNlpujqaijnp2Yj4iJjo2HgXx1aF9gaG5vcHBrYFVUXGZwfY6Zm5eWmJaPi42RkpSerbm9vby3qpqOiYN3aV1PPi0mKTE9TWR9jZadpquoop+clYyIi5COh4J8cmRdYGhsbW5vaFxUV2Bpc4KSm5uYmZqWj4uNj4+ToLC6vb69taaWjYiBdGdbTDorJys0P1FpgI6Wn6msqKKfm5KKiI6RjoiCe25hXGFnamttbWVaVVpjbHeGlZuampyclo6MjY2Nk6Oyu76/vLOik4yHfnBkWEg2KigtNkJUbYGOl6Krraein5mPiIqQko6Ig3lqXlthZmhpbGphWFZeZ297i5icm5yfnZaOjIyKi5SmtLy+v7uvnpGLhXptYlVEMykqMDhEWXCCjpmlrq2nop6WjIiMk5OOiYN2ZltbYWRlaGtnXldZYWpyf4+ZnJufoZ6VjoyKh4mWqba8v8C6q5qQioN3amBSQDAqLDI6R11zg46bqa+tp6Kdk4mIj5WTj4qCc2JaW2BiY2dpZFtXXGVsdYSSmpydoqSelI6LiISJmau3vcDAt6eXj4mAc2hdTjwuKy40PEtgdYOQn6ywrKeim5CIipKWlI+KgG9fWVtfX2FmZ2BZWGBob3mIlZucoKWlnpSOioWCipyuuL3Bv7SjlY6IfXBlWko4Li0wNT5OZHaDkqKusKynoZiNh4yUl5SQin1qXFlbXV1gZGRdWFtka3J9jJebnaOopp2UjoiCgYygsLm+wb6woJSOhnltY1ZFNS4vMjdBUmd3hJWmsLCrp6CVioiPlpeUkYl5ZltZW1pbX2NgWlheZ251gZCYm5+mq6ack42Gf4GPo7G5v8K8rZ2TjYN1amBSQTMvMTQ5Q1Zod4aYqrKwq6aekoiJkpiYlZGHdWNaWVlYWV1gXVhZYmtxeYaTmZyiqq2mnJOMg3yBkqWyusDBuambk4t/cmddTj0yMTM1OkdZaniInK2ysKumnI+IjJWZmJaRhXFgWVlXVVdcXVlXXGZuc3yKlZmdpa2upZuTin96g5ans7vBwLWlmZKJe25kWUk6MjM1NzxKW2p4i6Gvs6+rpZmMiI+XmpmXkYFtXllYVVJVWlpWV19qcHaAjZaan6mwrqWbkod8eoaZqbS8wr6yo5mShnhrYVVFODM1Njg/TV1reo+lsbKvq6OViomSmZqZl49+al1ZVlJQVFdWVFhjbXN5hZCXm6Kts66km5GEeXqJnKq0vcK8rqGZkIN0aF5RQTc1Nzg5QlBea3yUqLKyr6ugkomMlZqbmpeNeWddWVRPTlJVU1NaZ3B1fYmTmJymsbSupJqPgHd8jJ6rtb7BuaugmI5/cGVbTD03Nzk5O0RSX2yAmKuysq+pnY+Jj5ebm5uXinVlXVhRTExQUVBTXmtzeIGMlJifqrS1raOZjH12fpCgrLe/v7aon5iMe2xiVkc7Nzk6Oj1HVF9thJ2tsrKvqJqNi5KZm5ycloZyZF1XTklKTU5NVGJudXuFj5WZoq+3ta2jmIh5doGToay4v72yp5+XiHZpX1JDOjk7Ozs/SlVgcIihr7Kyr6WWjI2Vm5ycnJSCb2NcVEtGSEtKTFZmcnh+iZKWm6azubWsopaFd3eFlaKtub+7r6aflYRyZltNQDo7PTw8QkxWYHOOpK+ysq6ilIyQmJucnZyRfm1jXFFHREZHR0xaanR6goyUl52qt7q0rKKTgXZ6iJeir7q+uK2mn5J/bmNXSD07Pj89PkVOVmJ3k6ewsrKsn5GNk5qcnJ6bjntsY1pOREJDREVNXm53fYaQlZihr7q6tKugj312fYuYo7C6vLWspp6Pe2tfUkQ8PEBAPkBHT1ZkfJeosLKyqpyQj5abnJ2fmYp4a2NYSkFAQUBDT2JxeYCKkpaZpbS8urOrnox7d4CNmKSxurmyq6acinZnW01AOz5CQT9CSU9XZ4Kbqa+ysaeZkJKZnJyen5eGdmtiVEY/PT09Q1NmdHyEjpSWnKm4vbqzqpyIeXmDj5ilsrm3sKummoZyZFdIPjxBREJBRUtPWGuHnqqvsrCkl5GWm5ycn56Ug3VsYVFDPDs6O0RXand+iJGVl6Cvu765s6mYhHl7ho+ZprO4tK6rpZaBbmBSRDw+REVCQ0dMT1pwjKCqr7KuoZWTmZycnaCdkYB1bF5MPzo4NjlGW255gYyUlpmks76+ubKnlYJ6f4iQmaeztrGurKSSfGpcTUA8QEZGQ0VJTFBddpChqrCyq56VlpydnJ6gm41/dWtbSDw3NDM5SWBxe4WPlpecqbi/vrmypZGAe4KJkJqosrOwrqyijXdmWEg9PUNIRkVHSkxRYXuToaqwsaiclpqenZyfoJiKfnVqV0Q5NDExOU1kc36Jk5eYn668wL24saKNf36EipCbqbGwrq+snohzYlNEPD5GSUdGSUtMU2aAlaGqsK+lm5idn52doJ+ViH52Z1JANjEtLztSZ3aBjZaYmqSzvsC9uK+eioCBhoqQnKmvrq6wq5qDb15OQDtBSEpISUtMTFZrhJahqrCtopqboKCdnaCdkoZ+dWROPTQuKi4+Vmt4hJGYmZ2p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",
            "pulse.wav":
                "data:audio/wav;base64,UklGRiQKAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAKAACAgICAgICAgICAgICAgICAgIB/f39/f39/f39/f39/f39/f39/gICAgICAgICAgICAgICAgICAgH9/f39/fn5+fn5+fn5+fn5+fn5+f39/gICAgYGBgoKCgoKBgYGBgIB/f39+fn59fX19fX19fn5+f39/gICAgYGBgoKCg4ODg4OCgoKBgIB/fn18fHt7enp6ent7fH1+f4CCg4SFhYaGhoaFhYSDgoGAf318fHt6enp5enp6e3t8fX5+f4CBgoOEhIWGhoaHhoaGhYSDgoF/fXx6eXd2dXV1dXZ3eHp8foCChIaIiouMjIyLiomHhYOBf317eXh2dXV1dXV2dnd5ent9foCBg4SGh4iJiouLi4uKioiHhYOAfnt4dnNxcG9ubm9wcnR3e36ChYmMjpGSk5OTkZCNioeEgX16d3RycXBvb29wcXJ0dnh6fX+BhIaIioyNjpCQkZCQk42LiYaDf3t3dHBtamhnZ2doa25xdnp/hYqOkpaZmpubmpiVkY2IhH96dnJvbGppaGhpamxvcXR3en2BhIeJjI+Rk5SVlpaWlZORjoqGgn14c25qZmJgX19gYmVqb3V7gomPlZqeoaOko6GemZSPiYJ8dnFsaGVjYmFiY2Voa29zd3t/g4eKjpGUl5mam5ycm5mXlJCLhoB6c21nYl5aWFdXWVxhZ252foaOlp2jqKusrKuoo52Xj4iAeHFrZWFdW1paXF5hZGltcnd8gYaLj5OXmp2foKGioaCdmpaQi4R9dW5nYFpVUU9PUFNXXmVud4GLlZ6mrLG0tbWyraegmI+FfHNrZF5ZVVNTVFZZXWJnbXN5f4SKj5SYnKCjpaanp6ajoJyXkImBeXBoYFhSTUlHR0pOVFtlb3qGkZymr7a7vb68uLKqoZeMgndtZFxWUU5MTE5RVVpgZ210e4KIjpSZnqKlqKqrrKuppqKdl4+HfnVrYllRSkVCQEFESlFbZnJ/jJikr7i/w8XFwr21rKGViX1xZl1UTklHRkdKTlNZYGdvd36GjZOZnqOnqq2vsK+urKijnZWNhHpwZVtSSkM+Ozo8QUhRXGh2hJKgrLjBx8vMy8bAtqyfkoV3a19VTUdDQUFDRktSWWFpcnqCipGYnqOorK+xsrOysK2po5yUioB1al9VS0M8ODY2OT9HUV5seoqZp7TAyM7S0s/JwbaqnI5/cWRYTkZAPTw9QERLUlpjbHV+ho6WnKKnrK+ytLW1tLGtqKKakYd8cWVaT0U9NzMyMzc+SFNhcICQoK+8x8/U19XRysC0p5iJeWtdUkhAOzk4Oj5ES1RdZnB5gouTmqCmq6+ytba2trSxrKegl46DeGxgVUpBOTMwMDI3P0pXZXWGl6e1ws3U2NrX0sm+saKTg3NkV0xDPDg2Nzo/RU5WYGp0fYaPlp2kqa2xtLa3t7WzsKulnZSKf3RoXFFGPTYxLy8yOEFNW2p7jJ2tu8fR2Nvb19DHu62djX1tXlJHPjk1NTc7QUhRWmRueIKKkpqgpquvsrS1tra0sa2oopqRh3xwZFlNQzs0MC8wNDtFUWBvgJGisr/L1Nnb2tXNw7anl4d3Z1lNQzw3NTU4PURMVV9pc3yGjpacoqerr7GztLSzsq+rpZ6XjYN4bWFWS0I6NDEwMjc/SVZldYaWp7XCzdXZ2tfSyb6woZGBcWJVSkE7NzY4O0FIUVpkbneAiZGYnqOnq66wsbKysa+rp6Kbk4qAdmpfVUtCOzYzMzY7RE5banqKm6q4xM3U19fTzcO4qpuLe2xfUkhBOzk5O0BGTVZfaXJ7hIyTmZ6jp6qsrq+vrq2rqKSemJCHfnNpXlRLQzw4Njc6QElUYW9/jp6sucTM0dPSzse9saOVhndpXFFIQT08PUBFS1NcZW53f4eOlJqeoqWnqaqrq6qpp6Sgm5SNhXxyaF5VTEU/PDs8QEZPWmZ0g5KgrbnCyc3OzcjAtqqdj4FzZlpRSURBQEJGS1JZYWpyeoKJj5SZnaCipKamp6empaOgnJeRi4N6cWhfVk9IQ0BAQUVMVF9reIaUoa23wMXIyMbAua+jl4p8cGRaUkxHRkZITFFYX2dvdn6Eio+UmJudn6CioqOjoqGfnJmUj4iBeXFpYFlSTEhGRUdLUlpkcHyIlaGrtLvAwsK+ubGonZGFeW5kW1RPTEtMT1NYXmVsc3qAhouPkpWYmpucnZ6enp6dm5mWko2HgHlyamNcVVBNS0tNUlhgaXN/ipWgqbG2uru6t7GqoZeMgndtZV1YVFFRUlVZXmRqcHZ8gYaKjpCTlZaXmJmampqamZiWk4+LhoB5c2xlX1pVUlFRVFhdZW13gYuUnqassbO0s6+qo5uSiH92bmZgXFlXWFlcYGRpb3R5foKGiYyOkJGSk5SVlZaWlpWUk5CNiYWAenRuaGNeWlhXWFpdY2lxeYKLk5uip6utrauoo52VjYV9dm9pZGBeXV5gYmZqbnN3e3+DhYiKi42Oj5CQkZKSkpKSkZCOi4iEgHt2cGtnY2BeXV1fY2dtdHuDipGYnaGkpqakoZyXkYqDfHZwa2hlZGNkZmhrb3J2eX2AgoSGiImKi4uMjY2Oj4+Pj4+OjIqHhIB8d3NuamdlY2JjZWhscXZ8g4mPlJmcnp+fnZqWko2HgXx3cm9samlpamttcHN2eHt+gIKDhYaGh4iIiYqKi4yMjY2MjIqIhoOAfHl1cW5raWhoaGpscHR5foOIjJGUl5iZmJeUkY2JhYB8eHVycG9ubm9wcnR2eHp8foCBgoOEhIWFhoaHiImJioqKiomIh4WDgH16d3Ryb25tbW1vcXN3en6ChoqNkJKTk5KRj42Kh4OAfXp3dXRzc3NzdHZ3eXp8fX5/gIGCgoODg4SEhYaGh4iIiIiHh4aEgoB+fHl3dXNycXFyc3R2eXx/goWHioyNjo6NjIuJh4SCgH17eXh3d3Z3d3h5ent8fX5+f39/gICAgIGBgYKCgoODhISEhISDg4KBgH9+fHt6enl5eXl6ent9fn+BgoOEhYWGhoWFhIOCgYB/f359fXx8fHx8fX19fn5+f39/f3+AgICAgICBgYGCgoKCgoKCgoGBgIB/fn59fXx8fHx8fH19fn9/gIGBgoKCg4OCgoKBgYCAf39/fn5+fn5+fn5+f39/f39/f39/f3+AgICAgICAgIGBgYGBgYCAgICAf39/f35+fn5+fn5+f39/f4CAgICAgIGBgICAgICAgIB/f39/f39/f39/f39/f39/f39/f39/f4CAgICAgICAgICAgICAgICAgH9/f39/f39/f39/f39/f3+AgICAgICAgICAgICA"
        }
    }),

    // the last parameter is the initializer which builds the panes of the screen
    ({ game, image, audio, screen, globals }) => {

        // let's start with a gradient in the background
        const gradientPane = LinearGradientPane({
            colorStops: ['#000000', 200, '#100055' , 300, '#520055']
        })
        screen.addPane(gradientPane)

        // now we add a pattern and repeat it in the background
        const patternPane = PatternPane({
            image: image['pattern.png'],
            repeatX: true,
            repeatY: true
        })
        screen.addPane(
            patternPane
        )

        // we could add another pattern pane here, but let's use a tiles pane instead
        // a tiles pane is based on a tiles map, so we need to define tiles map first
        const map = TilesMap({
            tileBits: TILE.DIM_16x16,
            image: image['tiles.png'],
            map: [
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            ]
        })
        const tilesPane = TilesPane(
            {
                tilesMap: map,
                endlessX: true,
                endlessY: true,
            }
        )
        screen.addPane(tilesPane)

        // let's add some random highlight animations on our tilesPane,but let's use sprites
        // sprites are defined via a sprite sheet
        const sheet = SpriteSheet({
            id: 'sprite-sheet',
            image: image['sprites.png'],
            sprites: {
                "joystick": [0, 0, 46, 48],
                "high": [46, 0, 16, 16, 3]
            }
        })
        function randomizeHighlight(obj, frames = 15) {
            obj.pos = 0
            obj.sprites = []
            obj.moveX = Math.random() > 0.5 ? 1 : -1
            obj.moveY = Math.random() > 0.5 ? 1 : -1
            obj.startX = (15 - (frames % 16) - 4) * 2 + getRandomInt(20) * 16
            obj.wait = getRandomInt(150)
            return obj
        }
        // we define which highlight image is used in which frame
        const highlightPositions = [
            '1', '1', '1', '1', '1', '1', '1', '1', '2', '2', '2', '2', '2', '2', '3', '3', '3', '3',
            '2', '2', '2', '2', '2', '2', '2', '2', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1'
        ]
        const maxHeightTiles = 12
        const highlights = [
            randomizeHighlight({}),
            randomizeHighlight({}),
            randomizeHighlight({})
        ]
        // we will add sprites to the pane later
        const highlightsPane = SpritePane({
            id: 'highlight-pane',
            spriteSheet: sheet,
        })
        screen.addPane(highlightsPane)

        // we also want to show some text, so let's throw in a text pane
        const infoTexts = [
            'WELCOME TO A DEMO SCREEN',
            'YOU CAN MOVE THE JOYSTICK BY\nUSING THE WASD KEYS\nOR A GAMEPAD',
            'PRESS ESC TO OPEN THE EDITOR',
            'PRESS A BUTTON OR THE J KEY\nTO GO TO THE NEXT SCREEN',
            '@ 2026 BY\nTYROLITE SOFTWORKS'
        ]
        // generate x-positions using a AxisPath
        const infoTextPosX = []
        for (const text of infoTexts) {
            const endPos = game.width / 2 - Math.round(Math.max(...text.split('\n').map(line => line.length)) * 8 / 2)
            const pos =
                new AxisPath(game.width)
                    .addTarget(game.width, 40)
                    .addTarget(endPos, 30, PATH.TYPE.DAMPED)
                    .round()
            infoTextPosX.push(pos)
        }
        // generate colors for a text flash effect
        const flashSteps = 8
        const flashColors = getColorPath([160, 160, 112], [255, 255, 235], flashSteps, PATH.TYPE.ACCELERATED)

        const opacitySteps = 55
        const opacityPoints = new AxisPath(1.0).addTarget(0.0, opacitySteps, PATH.TYPE.DAMPED).getPoints()

        let infoIndex = 0
        const textPane = TextPane({
            "id": "text",
            "fonts": [
                globals.font
            ],
            "blocks": [
                // we have different text blocks depending on the style and positioning
                {
                    id: 'title',
                    text: 'REMAKE ENGINE',
                    autoCenteringX: true,
                    y: 50
                },
                {
                    id: 'lines',
                    text: '---------------\n\n---------------',
                    autoCenteringX: true,
                    y: 42,
                    filters: 'opacity(0.5)'
                },
                {
                    id: 'info',
                    text: infoTexts[infoIndex],
                }
            ]
        })
        screen.addPane(textPane)

        // last but not least a sprite pane to have moveable objects on screen
        const spritePane = SpritePane({
            id: "sprite-pane",
            spriteSheet: sheet,
        })
        spritePane.addSprite('player', 'joystick')
        spritePane.setSpriteBottomPos('player', 194, 94)

        screen.addPane(spritePane)

        // let's add some interactivity by adding an input controller for controlling the sprite
        const inputController = new InputController();
        inputController.setDirInputsKeyboard('w', 's', 'a', 'd')
        inputController.setDirInputsGamepad(12, 13, 14, 15)
        inputController.setDirInputsTouch('up', 'down', 'left', 'right')
        inputController.addInput('button', INPUT.TYPE.PRESS_AND_RELEASE)
        inputController.assignKeyToInput('button', 'j')
        inputController.assignButtonToInput('button', 0)
        inputController.assignTouchToInput('button', '1')

        let infoWaitFrames = 0
        let flashIndex = 0
        let opacityIndex = 0
        let infoWait = 250
        let moveGradient = 1

        // let's also have some audio playing in the background
        game.audio.addAudioResources({
            pad: audio['pad.wav'],
            pulse: audio['pulse.wav']
        })
        game.audio.addChannel('pad-channel')
        game.audio.addChannel('pulse-channel')
        game.audio.loop('pad', 'bgm-channel')
        game.audio.loop('pulse', 'pulse-channel')

        return ({ game, frames }) => {
            // screen game loop

            // update gradient color
            gradientPane.scrollBy(0, moveGradient)
            if (frames % 300 === 299) {
                moveGradient *= -1
            }

            // scroll background panes
            patternPane.scrollBy(1, 0)
            tilesPane.scrollBy(2, frames === 0 ? 12 : 0)

            // update info text block
            let path = infoTextPosX[infoIndex]
            if (opacityIndex === 0) {
                if (!path.isEnd()) {
                    path.forward()
                }
                infoWaitFrames++
                if (infoWaitFrames > (infoWait + 1 - flashSteps)) {
                    flashIndex++
                }
                if (infoWaitFrames === infoWait) {
                    infoWaitFrames = 0
                    opacityIndex++

                }
            } else {
                opacityIndex++
                if (opacityIndex >= opacityPoints.length) {
                    path.rewind()
                    infoIndex = (infoIndex + 1) % infoTexts.length
                    path = infoTextPosX[infoIndex]
                    opacityIndex = 0
                    flashIndex = 0
                }
            }
            textPane.removeTextBlock('info');
            textPane.addTextBlock({
                id: 'info',
                x: path.getCurrentPoint(),
                y: 140,
                textAlign: 'center',
                lineSpacing: 4,
                text: infoTexts[infoIndex],
                filters: `monochrome(${flashColors[flashIndex]})|opacity(${opacityPoints[opacityIndex]})`
            });

            // update sprite positions
            highlightsPane.updateFrames()
            spritePane.updateFrames()

            // any updates on our controller?
            inputController.awaitInput('button')
            inputController.update()

            if (inputController.hasInput('button')) {
                game.gotoScreen('game')
            }

            let moveX = 0
            let moveY = 0
            if (inputController.isLeftDir()) {
                moveX--
            }
            if (inputController.isRightDir()) {
                moveX++
            }
            if (inputController.isUpDir()) {
                moveY--
            }
            if (inputController.isDownDir()) {
                moveY++
            }

            // update the sprites for each highlight
            for (let index = 0; index < highlights.length; index++) {
                const currHighlight = highlights[index]
                const { pos, sprites, startX, moveX, moveY } = currHighlight
                if (sprites.length === 0 || sprites.at(-1) !== null) {
                    const next = pos >= highlightPositions.length ? null : {
                        pos,
                        sprite: 'high' + highlightPositions[pos]
                    }
                    sprites.unshift(next)
                }

                let i = 0
                const newSprites = []
                while (sprites.length) {
                    const item = sprites.shift()
                    if (item !== null) {
                        let x = startX + (i * 16 * moveX) - (2 * pos) - 2
                        let y = (moveY > 0 ? maxHeightTiles - i : i) * 16 + 4
                        const spriteId = `sprite_${index}_` + item.pos
                        if (i === 0) {
                            highlightsPane.addSprite(spriteId, item.sprite, x, y)
                        } else if (i <= maxHeightTiles) {
                            highlightsPane.setSpritePos(spriteId, x, y)
                        } else {
                            highlightsPane.removeSprite(spriteId)
                        }
                    }
                    if (i <= maxHeightTiles) {
                        newSprites.push(item)
                    }
                    i++
                }
                if (newSprites.at(-1) === null && pos > currHighlight.wait) {
                    randomizeHighlight(currHighlight, frames)
                } else {
                    currHighlight.sprites = newSprites
                    currHighlight.pos++
                }
            }

            // move the player sprite if there was movement
            const sprite = spritePane.getSprite('player')
            if (moveX || moveY) {
                spritePane.setSpritePos(
                    'player',
                    clamp(0,sprite.x + moveX, game.width - sprite.width),
                    clamp(0, sprite.y + moveY, game.height - sprite.height)
                )
            }
        }
    }
)
