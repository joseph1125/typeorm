import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import {Post} from "./entity/Post";
import {expect} from "chai";

describe("other issues > mongodb entity change in subscribers should affect persistence", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        subscribers: [__dirname + "/subscriber/*{.js,.ts}"]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("if entity was changed, subscriber should be take updated columns", () => Promise.all(connections.map(async function(connection) {

        const post = new Post();
        post.title = "hello world";
        await connection.manager.save(post);

        // check if it was inserted correctly
        const loadedPost = await connection.manager.findOne(Post);
        expect(loadedPost).not.to.be.empty;
        expect(loadedPost!.active).should.be.equal(false);
        expect(loadedPost!.loaded).should.be.equal(true);

        // now update some property and let update subscriber trigger
        loadedPost!.active = true;
        loadedPost!.title += "!";
        await connection.manager.save(loadedPost!);

        // check if subscriber was triggered and entity was really taken changed columns in the subscriber
        const loadedUpdatedPost = await connection.manager.findOne(Post);

        expect(loadedUpdatedPost).not.to.be.empty;
        expect(loadedUpdatedPost!.loaded).should.be.equal(true);
        expect(loadedUpdatedPost!.updatedColumns).to.equals(2);

        await connection.manager.save(loadedPost!);

    })));

    it("if entity was loaded, loaded property should be changed", () => Promise.all(connections.map(async function(connection) {

        const post = new Post();
        post.title = "hello world";
        await connection.manager.save(post);

        // check if it was inserted correctly
        const loadedPost = await connection.manager.findOne(Post);

        expect(loadedPost).not.to.be.empty;
        expect(loadedPost!.loaded).should.be.equal(true);

        await connection.manager.save(loadedPost!);

    })));

});
