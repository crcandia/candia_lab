---
# An instance of the Contact widget.
# Documentation: https://wowchemy.com/docs/page-builder/
widget: contact

# This file represents a page section.
headless: true

# Order that this section appears on the page.
weight: 10

title: Contact
subtitle:

content:
  # Contact (edit or remove options as required)

  email: test@example.org
  phone: +1 857 242 8452 (Only Whatsapp)
  address:
    street: 680 La Plaza Avenue
    city: Las Condes
    region: Región Metropolitana
    postcode: ''
    country: Chile
    country_code: 'CL'
  coordinates:
    latitude: '-33.39160294597748'
    longitude: '-70.50089862789612'
  directions: Engineering School, Second Floor. 
  office_hours:
    - 'Monday 10:00 to 13:00'
    - 'Thursday 09:00 to 11:00'
  appointment_url: 'https://calendly.com/crcandiav/30min'
  #contact_links:
  #  - icon: comments
  #    icon_pack: fas
  #    name: Discuss on Forum
  #    link: 'https://discourse.gohugo.io'

  # Automatically link email and phone or display as text?
  autolink: true

  # Email form provider
  form:
    provider: netlify
    formspree:
      id:
    netlify:
      # Enable CAPTCHA challenge to reduce spam?
      captcha: false

design:
  columns: '1'
---
