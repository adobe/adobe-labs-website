## Summary of changes
<!-- Add description of work done here -->
- Add ???
- Fix ???

## Relevant Links
- Story: [ADBLABS-XX](https://sparkbox.atlassian.net/browse/ADBLABS-XX)

## Test URLs:
- Before: https://main--adobe-labs-website--adobe.aem.live/
- After: https://<branch>--adobe-labs-website--adobe.aem.live/

## Checklist
<!-- Delete anything irrelevant to this PR -->
* [ ] This PR has visual changes, and has been reviewed by a designer.
* [ ] This PR has code changes, and our linters still pass.
* [ ] This PR has new code, so new tests were added or updated, and they pass.
* [ ] This PR affects production code, so it was browser tested (see below).
* [ ] This PR has copy changes, so copy was proofread and approved.
* [ ] The content of this PR requires documentation, so we added a detailed description of the component's purpose, requirements, quirks, and instructions for use by designers and developers. This includes accessibility information if pertinent.

## Validation
1. Make sure all PR checks have passed.
2. Pull down the branch and run locally or view on the PR testing link.
3. Verify the implementation against the design and story requirements.

### Validation steps
- [ ] <!-- Add acceptance criteria specific to this PR -->
- [ ] <!-- Add additional reviewer checks -->

---

## Browser Testing
We should aim to support the latest version of the listed browsers. For older versions or other browsers not on the list, content should be accessible, even if it doesn't completely match the designs.

Developers should test as they work in the browsers available on their machines. If they have access to other devices to test other browser/OS combinations, they should do that when possible.

Blocks and pages should undergo comprehensive testing to ensure they work as expected in real-use scenarios. Standard testing during pre-production should include _at least_ these browsers.

* [ ] Firefox
* [ ] Chrome
* [ ] Safari

### Dark mode and light mode
Most pages support both dark and light mode, based on `prefers-color-scheme`. 
Changes that affect the frontend should support both color schemes.

* [ ] Frontend changes have been tested in both light mode and dark mode. 