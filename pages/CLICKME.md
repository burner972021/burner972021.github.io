---
layout: default
title: ABOUT ME
permalink: /CLICKME/
---

<div id="person-display"></div>

<script>
const people = [
  { name: "Xizhen", description: "Whenever I am not sleeping or showering, I have my socks on. I only own white socks." },
  { name: "Frank Li", description: "I aliased fastfetch to ff so I can larp 0.2 seconds faster. My sister says it's a neat trick." },
  { name: "burner972021", description: "Tomorrow is a new day and I'll grow older. I want to lose some weight and I don't want to grow old." },
  { name: "Xizhen", description: "I'm hungry." },
  { name: "Frank Li", description: "You always want something from me but today I'm kinda tired. Can't you come back tomorrow instead?" },
  { name: "burner972021", description: "I use Arch Linux by the way!" }
];

const person = people[Math.floor(Math.random() * people.length)];

document.getElementById("person-display").innerHTML =
  '<div style="height: 50px"></div>' +
  '<strong>' + person.name + ':</strong> ' +
  person.description;
</script>