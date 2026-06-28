---
title: posts
layout: default
permalink: /posts/
---

<div class="post-filter">
  <div class="pf-row pf-top-row">
    <input type="search" id="pf-text" placeholder="search posts..." autocomplete="off" />
    <button id="pf-advanced-toggle" class="pf-pill" aria-expanded="false">advanced ▾</button>
  </div>
  <div id="pf-advanced">
    <div class="pf-row">
      <span class="pf-label">sort by</span>
      <div class="pf-pills">
        <button class="pf-pill pf-sort active" data-sort="date">date</button>
        <button class="pf-pill pf-sort" data-sort="cat">category</button>
        <button class="pf-pill pf-sort" data-sort="tag">tag</button>
        <button class="pf-pill pf-sort" data-sort="rating">rating</button>
      </div>
    </div>
    <div class="pf-row">
      <span class="pf-label">category</span>
      <div class="pf-pills">
        {% assign cats = site.posts | map: "categories" | flatten | uniq | sort %}
        {% for cat in cats %}
        <button class="pf-pill pf-filter" data-group="cat" data-value="{{ cat | downcase }}">{{ cat }}</button>
        {% endfor %}
      </div>
    </div>
    <div class="pf-row">
      <span class="pf-label">tag</span>
      <div class="pf-pills">
        {% assign all_tags = site.posts | map: "tags" | flatten | uniq | sort %}
        {% for tag in all_tags %}
        <button class="pf-pill pf-filter" data-group="tag" data-value="{{ tag | downcase }}">{{ tag }}</button>
        {% endfor %}
      </div>
    </div>
    <div class="pf-row">
      <button id="pf-clear">clear</button>
      <span id="pf-count"></span>
    </div>
  </div>
</div>

<div class="post-list" id="post-list">
  {% assign posts = site.posts | sort: "date" | reverse %}
  {% for post in posts %}
  {% assign post_cats = post.categories | join: " " | downcase %}
  {% assign post_tags = post.tags | join: " " | downcase %}
  {% assign post_rating = post.rating | default: 0 | plus: 0 %}
  <a class="post-item"
     href="{{ post.url | relative_url }}"
     data-cats="{{ post_cats }}"
     data-tags="{{ post_tags }}"
     data-text="{{ post.title | downcase }} {{ post.excerpt | strip_html | downcase }}"
     data-date="{{ post.date | date: '%s' }}"
     data-cat-sort="{{ post.categories | first | downcase }}"
     data-tag-sort="{{ post.tags | first | downcase }}"
     data-rating="{{ post_rating }}">
    <div class="post-item-header">
      <span class="post-item-title">{{ post.title }}</span>
      <span class="post-item-meta">
        {% assign tag_limit = post.tags | slice: 0, 2 %}
        {% for tag in tag_limit %}<span class="post-item-tag">{{ tag }}</span>{% endfor %}
        <span class="post-item-date">{{ post.date | date: "%b %d, %Y" }}</span>
      </span>
    </div>
    <div class="post-item-sub">
      <span>{{ post.categories | first }}: {{ post.excerpt | strip_html | truncatewords: 20 }}</span>
      <span class="post-item-rating">{% if post_rating > 0 %}{% for i in (1..5) %}{% if i <= post_rating %}★{% else %}☆{% endif %}{% endfor %}{% else %}&ndash;{% endif %}</span>
    </div>
  </a>
  {% endfor %}
</div>

<p id="pf-empty" hidden style="padding:10px;color:#555;font-family:inherit;">no posts match.</p>

<script src="/assets/js/posts-filter.js"></script>
