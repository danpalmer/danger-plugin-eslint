import eslint from "./index"

declare const global: any

const mockFileContents = (contents: string) => {
  const asyncContents: Promise<string> = new Promise((resolve, reject) => resolve(contents))
  return async (path: string): Promise<string> => asyncContents
}

const defaultConfig = {
  env: {
    browser: true,
  },
  extends: "eslint:recommended",
}

describe("eslint()", () => {
  beforeEach(() => {
    global.warn = jest.fn()
    global.message = jest.fn()
    global.fail = jest.fn()
    global.markdown = jest.fn()
  })

  afterEach(() => {
    global.warn = undefined
    global.message = undefined
    global.fail = undefined
    global.markdown = undefined
  })

  it("does not lint anything when no files in PR", async () => {
    global.danger = {
      github: { pr: { title: "Test" } },
      git: { created_files: [], modified_files: [] },
    }

    await eslint(defaultConfig)

    expect(global.fail).not.toHaveBeenCalled()
  })

  it("does not fail when a valid file is in PR", async () => {
    global.danger = {
      github: {
        pr: { title: "Test" },
        utils: { fileContents: mockFileContents(`1 + 1;`) },
      },
      git: { created_files: ["foo.js"], modified_files: [] },
    }

    await eslint(defaultConfig)

    expect(global.fail).not.toHaveBeenCalled()
  })

  it("calls fail for each eslint violation", async () => {
    global.danger = {
      github: {
        pr: { title: "Test" },
        utils: {
          fileContents: mockFileContents(
            `
          var foo = 1 + 1;
          console.log(foo);
        `.trim(),
          ),
        },
      },
      git: { created_files: ["foo.js"], modified_files: [] },
    }

    await eslint({
      rules: {
        "no-console": 2,
        "no-undef": 2,
      },
    })

    expect(global.fail).toHaveBeenCalledTimes(2)
    expect(global.fail).toHaveBeenLastCalledWith("foo.js line 2 – 'console' is not defined. (no-undef)", "foo.js", 2)
  })

  it("uses the provided eslint config", async () => {
    global.danger = {
      github: {
        pr: { title: "Test" },
        utils: {
          fileContents: mockFileContents(`
          var foo = 1 + 1;
          console.log(foo);
        `),
        },
      },
      git: { created_files: ["foo.js"], modified_files: [] },
    }

    await eslint({
      rules: {
        "no-undef": 0,
      },
    })

    expect(global.fail).not.toHaveBeenCalled()
  })

  it("ignores files typically ignored by options/config", async () => {
    global.danger = {
      github: {
        pr: { title: "Test" },
        utils: {
          fileContents: mockFileContents(`
          var foo = 1 + 1;
          console.log(foo);
        `),
        },
      },
      git: { created_files: ["foo.json"], modified_files: [] },
    }

    await eslint(defaultConfig)

    expect(global.fail).not.toHaveBeenCalled()
  })

  it("optionally override extensions to lint", async () => {
    global.danger = {
      github: {
        pr: { title: "Test" },
        utils: {
          fileContents: mockFileContents(
            `
          var foo = 1 + 1;
          console.log(foo);
        `.trim(),
          ),
        },
      },
      git: { created_files: ["a.json"], modified_files: [] },
    }

    await eslint(
      {
        rules: {
          "no-console": 2,
          "no-undef": 2,
        },
      },
      [".json"],
    )

    expect(global.fail).toHaveBeenCalledTimes(2)
    expect(global.fail).toHaveBeenLastCalledWith("a.json line 2 – 'console' is not defined. (no-undef)", "a.json", 2)
  })

  it("should convert a eslint config passed in as a string to an object", async () => {
    global.danger = {
      github: { pr: { title: "Test" } },
      git: { created_files: [], modified_files: [] },
    }

    await eslint(JSON.stringify(defaultConfig))

    expect(global.fail).not.toHaveBeenCalled()
  })
})
