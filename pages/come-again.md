---
layout: default
title: "Come Again?"
permalink: /come-again/
---

Come again?

{% assign chapters = site.pages | where: "layout", "comeagain" | sort: "index" %}
{% for chap in chapters %}
<a href="{{ chap.url | relative_url }}">{{ chap.index }}. {{ chap.title }}</a>
{% endfor %}