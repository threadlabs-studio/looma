import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import {
  validateCandidateRegistryEvidence,
  verifyHostedDocs
} from "./verify-hosted-docs.mjs";

const sourceCommit = "a".repeat(40);
const packages = ["@future/tokens", "@future/core", "@future/vue"];

function manifest(overrides = {}) {
  return {
    schemaVersion: 1,
    releaseVersion: "0.1.1",
    sourceCommit,
    packages: packages.map((name, publishIndex) => ({
      publishIndex,
      name,
      version: "0.1.1"
    })),
    ...overrides
  };
}

function html(text, head = "") {
  return `<!doctype html><html><head>${head}</head><body><main>${text}</main></body></html>`;
}

async function withDocsServer(routeBodies, run) {
  const server = createServer((request, response) => {
    const body = routeBodies[request.url];
    response.writeHead(body ? 200 : 404, { "content-type": "text/html; charset=utf-8" });
    response.end(body ?? "not found");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    return await run(`http://127.0.0.1:${address.port}/`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function validRoutes() {
  return {
    "/": html(`Getting Started Release 1 Candidate 0.1.1 ${packages.join(" ")}`),
    "/release-1-support/": html(`Release 1 Support and Limitations Candidate 0.1.1 ${packages.join(" ")}`),
    "/components/ui-context-menu/": html("Context Menu Candidate contract")
  };
}

function registryEvidence(overrides = {}) {
  return {
    schemaVersion: 1,
    registry: "https://registry.npmjs.org/",
    sourceCommit,
    releaseVersion: "0.1.1",
    requiredTags: ["candidate"],
    packages: packages.map((name) => ({
      name,
      version: "0.1.1",
      integrity: `sha512-${name}`,
      distTags: { candidate: "0.1.1" }
    })),
    ...overrides
  };
}

test("verifies key hosted routes from manifest-derived package identities", async () => {
  await withDocsServer(validRoutes(), async (baseUrl) => {
    const evidence = await verifyHostedDocs({
      baseUrl,
      manifest: manifest(),
      manifestPath: ".release/artifacts/release-manifest.json",
      checkoutCommit: sourceCommit,
      registryEvidence: registryEvidence(),
      attempts: 1
    });

    assert.equal(evidence.result, "passed");
    assert.equal(evidence.releaseVersion, "0.1.1");
    assert.deepEqual(evidence.packages, packages.map((name) => ({ name, version: "0.1.1" })));
    assert.deepEqual(evidence.routes.map(({ status }) => status), [200, 200, 200]);
    for (const route of evidence.routes) assert.match(route.sha256, /^[a-f0-9]{64}$/);
  });
});

test("rejects noindex on any deployed key route", async () => {
  const routes = validRoutes();
  routes["/release-1-support/"] = html(
    `Release 1 Support and Limitations Candidate 0.1.1 ${packages.join(" ")}`,
    '<meta name="robots" content="noindex,nofollow">'
  );
  await withDocsServer(routes, async (baseUrl) => {
    await assert.rejects(
      verifyHostedDocs({ baseUrl, manifest: manifest(), checkoutCommit: sourceCommit, attempts: 1 }),
      /release-1-support.*noindex/i
    );
  });
});

test("rejects stale pre-publication wording", async () => {
  const routes = validRoutes();
  routes["/"] = html(
    `Getting Started Release 1 Candidate 0.1.1 ${packages.join(" ")} Packages are not published yet.`
  );
  await withDocsServer(routes, async (baseUrl) => {
    await assert.rejects(
      verifyHostedDocs({ baseUrl, manifest: manifest(), checkoutCommit: sourceCommit, attempts: 1 }),
      /stale publication wording/i
    );
  });
});

test("rejects package or version drift from the release manifest", async () => {
  const routes = validRoutes();
  routes["/"] = html(`Getting Started Release 1 Candidate 0.1.1 ${packages.slice(1).join(" ")}`);
  await withDocsServer(routes, async (baseUrl) => {
    await assert.rejects(
      verifyHostedDocs({ baseUrl, manifest: manifest(), checkoutCommit: sourceCommit, attempts: 1 }),
      /@future\/tokens|version 0\.1\.1/
    );
  });
});

test("rejects a manifest from another checkout", async () => {
  await withDocsServer(validRoutes(), async (baseUrl) => {
    await assert.rejects(
      verifyHostedDocs({ baseUrl, manifest: manifest(), checkoutCommit: "b".repeat(40), attempts: 1 }),
      /source commit.*checkout/i
    );
  });
});

test("rejects Candidate registry evidence that does not match the manifest graph", () => {
  const evidence = registryEvidence();
  evidence.packages[0].distTags.candidate = "0.1.3";
  assert.throws(
    () => validateCandidateRegistryEvidence(manifest(), evidence),
    /does not bind @future\/tokens to the candidate tag/
  );
});

test("rejects redirects away from the deployed docs origin", async () => {
  const routes = validRoutes();
  const fetchImpl = async (url) => {
    const response = new Response(routes[url.pathname], {
      status: 200,
      headers: { "content-type": "text/html" }
    });
    Object.defineProperty(response, "url", {
      value: url.pathname === "/" ? "https://other.example/" : url.href
    });
    return response;
  };

  await assert.rejects(
    verifyHostedDocs({
      baseUrl: "https://docs.example/",
      manifest: manifest(),
      checkoutCommit: sourceCommit,
      attempts: 1,
      fetchImpl
    }),
    /redirected away from https:\/\/docs\.example/
  );
});
