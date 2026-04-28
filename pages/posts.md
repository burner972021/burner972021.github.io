---
title: posts
layout: default
permalink: /posts/
---

<div class="post-list">
  {% assign posts = site.posts | sort: "date" | reverse %}
  {% for post in posts %}
  <a class="post-item" href="{{ post.url | relative_url }}">
    <div class="post-item-header">
      <span class="post-item-title">{{ post.title }}</span>
      <span class="post-item-meta">
        {% assign tag_limit = post.tags | slice: 0, 2 %}
        {% for tag in tag_limit %}<span class="post-item-tag">{{ tag }}</span>{% endfor %}
        <span class="post-item-date">{{ post.date | date: "%b %d, %Y" }}</span>
      </span>
    </div>
    <div class="post-item-sub">{{ post.categories | first }}: {{ post.excerpt | strip_html | truncatewords: 20 }}</div>
  </a>
  {% endfor %}
</div>
